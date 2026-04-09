"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scoreBattlePoints } from "@/lib/battlePoints";

export type BattleResult = "win" | "loss" | "draw";

export interface BattleHistoryItem {
  id: string;
  mode: string;
  category: string;
  result: BattleResult;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  pointsEarned: number;
  playedAt: string;
}

interface BattleSessionRecordInput {
  mode: string;
  category: string;
  result: BattleResult;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  playedAt?: string;
}

interface BattleStatsState {
  battlesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalBattlePoints: number;
  totalScoreFor: number;
  totalScoreAgainst: number;
  currentWinStreak: number;
  bestWinStreak: number;
  battleHistory: BattleHistoryItem[];
  recordBattleSession: (record: BattleSessionRecordInput) => void;
  importLegacySessions: () => void;
}

const LEGACY_BATTLE_KEY = "local-battle-sessions";

const toHistoryItem = (record: BattleSessionRecordInput): BattleHistoryItem => {
  const pointsEarned = scoreBattlePoints(record);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    mode: record.mode,
    category: record.category,
    result: record.result,
    userScore: Math.max(0, record.userScore),
    opponentScore: Math.max(0, record.opponentScore),
    opponentName: record.opponentName,
    pointsEarned,
    playedAt: record.playedAt ?? new Date().toISOString(),
  };
};

const applyRecord = (state: BattleStatsState, item: BattleHistoryItem): BattleStatsState => {
  const nextWinStreak = item.result === "win" ? state.currentWinStreak + 1 : 0;

  return {
    ...state,
    battlesPlayed: state.battlesPlayed + 1,
    wins: state.wins + (item.result === "win" ? 1 : 0),
    losses: state.losses + (item.result === "loss" ? 1 : 0),
    draws: state.draws + (item.result === "draw" ? 1 : 0),
    totalBattlePoints: state.totalBattlePoints + item.pointsEarned,
    totalScoreFor: state.totalScoreFor + item.userScore,
    totalScoreAgainst: state.totalScoreAgainst + item.opponentScore,
    currentWinStreak: nextWinStreak,
    bestWinStreak: Math.max(state.bestWinStreak, nextWinStreak),
    battleHistory: [item, ...state.battleHistory].slice(0, 120),
  };
};

export const useBattleStatsStore = create<BattleStatsState>()(
  persist(
    (set, get) => ({
      battlesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalBattlePoints: 0,
      totalScoreFor: 0,
      totalScoreAgainst: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      battleHistory: [],
      recordBattleSession: (record) =>
        set((state) => {
          const item = toHistoryItem(record);
          return applyRecord(state, item);
        }),
      importLegacySessions: () => {
        if (typeof window === "undefined") return;
        const state = get();
        if (state.battleHistory.length > 0 || state.battlesPlayed > 0) return;

        try {
          const raw = window.localStorage.getItem(LEGACY_BATTLE_KEY);
          if (!raw) return;

          const parsed = JSON.parse(raw) as Array<BattleSessionRecordInput & { playedAt?: string }>;
          if (!Array.isArray(parsed) || parsed.length === 0) return;

          const imported = parsed.slice(-120);
          set((current) => {
            let next = { ...current };
            imported.forEach((record) => {
              const item = toHistoryItem({
                mode: record.mode,
                category: record.category,
                result: record.result,
                userScore: record.userScore,
                opponentScore: record.opponentScore,
                opponentName: record.opponentName,
                playedAt: record.playedAt,
              });
              next = applyRecord(next, item);
            });
            return next;
          });
        } catch {
          // Ignore malformed legacy cache.
        }
      },
    }),
    {
      name: "battle-stats-store",
    }
  )
);

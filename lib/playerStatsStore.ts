"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QuizSessionRecord {
  category: string;
  difficulty: string;
  questionCount: number;
  correct: number;
  total: number;
  passed: boolean;
  bestStreak: number;
  points: number;
  completedAt?: string;
}

export interface PlayerQuizHistoryItem {
  id: string;
  category: string;
  difficulty: string;
  questionCount: number;
  correct: number;
  total: number;
  passed: boolean;
  points: number;
  completedAt: string;
}

interface PlayerStatsState {
  quizzesCompleted: number;
  totalCorrectAnswers: number;
  totalAnsweredQuestions: number;
  bestStreak: number;
  totalPoints: number;
  quizHistory: PlayerQuizHistoryItem[];
  recordQuizSession: (session: QuizSessionRecord) => void;
}

export const usePlayerStatsStore = create<PlayerStatsState>()(
  persist(
    (set) => ({
      quizzesCompleted: 0,
      totalCorrectAnswers: 0,
      totalAnsweredQuestions: 0,
      bestStreak: 0,
      totalPoints: 0,
      quizHistory: [],
      recordQuizSession: (session) =>
        set((state) => {
          const historyEntry: PlayerQuizHistoryItem = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            category: session.category,
            difficulty: session.difficulty,
            questionCount: session.questionCount,
            correct: Math.max(0, session.correct),
            total: Math.max(0, session.total),
            passed: session.passed,
            points: Math.max(0, session.points),
            completedAt: session.completedAt ?? new Date().toISOString(),
          };

          return {
            quizzesCompleted: state.quizzesCompleted + 1,
            totalCorrectAnswers: state.totalCorrectAnswers + historyEntry.correct,
            totalAnsweredQuestions: state.totalAnsweredQuestions + historyEntry.total,
            bestStreak: Math.max(state.bestStreak, Math.max(0, session.bestStreak)),
            totalPoints: state.totalPoints + historyEntry.points,
            quizHistory: [historyEntry, ...state.quizHistory].slice(0, 50),
          };
        }),
    }),
    {
      name: "quizarena-player-stats",
    }
  )
);

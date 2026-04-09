"use client";

import { scoreBattlePoints } from "@/lib/battlePoints";
import { fetchBattleLeaderboard, fetchTriviaJourneyLeaderboard } from "@/lib/supabase/leaderboards";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProfileRow {
  profile_key: string;
  display_name: string;
  handle: string;
  bio: string | null;
  tier: string;
  tags: string[];
  avatar_type: "initials" | "icon" | "image";
  avatar_value: string;
  updated_at: string;
}

interface QuizSessionRow {
  category: string;
  difficulty: string;
  correct: number;
  total: number;
  points: number;
  best_streak: number;
  completed_at: string;
}

interface BattleSessionRow {
  mode: string;
  category: string;
  result: "win" | "loss" | "draw";
  user_score: number;
  opponent_score: number;
  opponent_name: string;
  played_at: string;
}

export interface PublicPlayerCardData {
  profileKey: string;
  displayName: string;
  handle: string;
  bio: string;
  tier: string;
  tags: string[];
  avatar: string;
  lastUpdatedAt: string;
  trivia: {
    rank: number | null;
    points: number;
    journeys: number;
    accuracy: number;
    bestStreak: number;
  };
  battle: {
    rank: number | null;
    points: number;
    battles: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  };
  recentTrivia: QuizSessionRow[];
  recentBattle: BattleSessionRow[];
}

const initialsFromName = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PL";

export const fetchPublicPlayerCardByProfileKey = async (profileKey: string): Promise<PublicPlayerCardData | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const [profileResponse, triviaResponse, battleResponse, triviaBoard, battleBoard] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("profile_key, display_name, handle, bio, tier, tags, avatar_type, avatar_value, updated_at")
      .eq("profile_key", profileKey)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("app_quiz_sessions")
      .select("category, difficulty, correct, total, points, best_streak, completed_at")
      .eq("profile_key", profileKey)
      .order("completed_at", { ascending: false })
      .limit(12)
      .returns<QuizSessionRow[]>(),
    supabase
      .from("app_battle_sessions")
      .select("mode, category, result, user_score, opponent_score, opponent_name, played_at")
      .eq("profile_key", profileKey)
      .order("played_at", { ascending: false })
      .limit(12)
      .returns<BattleSessionRow[]>(),
    fetchTriviaJourneyLeaderboard("global"),
    fetchBattleLeaderboard("global"),
  ]);

  if (profileResponse.error || !profileResponse.data) return null;

  const profile = profileResponse.data;
  const recentTrivia = triviaResponse.data ?? [];
  const recentBattle = battleResponse.data ?? [];

  const triviaJourneys = recentTrivia.length;
  const triviaPoints = recentTrivia.reduce((sum, row) => sum + Math.max(0, row.points), 0);
  const triviaCorrect = recentTrivia.reduce((sum, row) => sum + Math.max(0, row.correct), 0);
  const triviaTotal = recentTrivia.reduce((sum, row) => sum + Math.max(0, row.total), 0);
  const triviaBestStreak = recentTrivia.reduce((best, row) => Math.max(best, Math.max(0, row.best_streak)), 0);
  const triviaAccuracy = triviaTotal > 0 ? Math.round((triviaCorrect / triviaTotal) * 100) : 0;

  const battleMatches = recentBattle.length;
  const battleWins = recentBattle.filter((row) => row.result === "win").length;
  const battleLosses = recentBattle.filter((row) => row.result === "loss").length;
  const battleDraws = recentBattle.filter((row) => row.result === "draw").length;
  const battlePoints = recentBattle.reduce(
    (sum, row) => sum + scoreBattlePoints({ result: row.result, userScore: row.user_score, opponentScore: row.opponent_score }),
    0
  );
  const battleWinRate = battleMatches > 0 ? Math.round((battleWins / battleMatches) * 100) : 0;

  const triviaRank = triviaBoard.find((entry) => entry.id === profileKey)?.rank ?? null;
  const battleRank = battleBoard.find((entry) => entry.id === profileKey)?.rank ?? null;

  return {
    profileKey,
    displayName: profile.display_name,
    handle: profile.handle,
    bio: profile.bio ?? "",
    tier: profile.tier,
    tags: Array.isArray(profile.tags) ? profile.tags : [],
    avatar: profile.avatar_type === "initials" && profile.avatar_value ? profile.avatar_value : initialsFromName(profile.display_name),
    lastUpdatedAt: profile.updated_at,
    trivia: {
      rank: triviaRank,
      points: triviaPoints,
      journeys: triviaJourneys,
      accuracy: triviaAccuracy,
      bestStreak: triviaBestStreak,
    },
    battle: {
      rank: battleRank,
      points: battlePoints,
      battles: battleMatches,
      wins: battleWins,
      losses: battleLosses,
      draws: battleDraws,
      winRate: battleWinRate,
    },
    recentTrivia,
    recentBattle,
  };
};

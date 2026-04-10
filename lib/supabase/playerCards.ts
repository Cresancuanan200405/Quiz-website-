"use client";

import { buildAchievementProgress, getUnlockedAchievements, type AchievementProgressItem } from "@/lib/achievements";
import { scoreBattlePoints } from "@/lib/battlePoints";
import type { ProfilePhotoValue } from "@/lib/profilePhotoStore";
import type { PlayerQuizHistoryItem } from "@/lib/playerStatsStore";
import { fetchBattleLeaderboard, fetchTriviaJourneyLeaderboard } from "@/lib/supabase/leaderboards";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProfileRow {
  profile_key: string;
  display_name: string;
  handle: string;
  bio: string | null;
  tier: string;
  tags: string[];
  avatar_type: ProfilePhotoValue["type"];
  avatar_value: string;
  public_profile: boolean;
  show_online_status: boolean;
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

interface SavedFactRow {
  fact_id: string;
  created_at: string;
}

const ratingToRank = (rating: number) => {
  if (rating >= 94) return "Grandmaster";
  if (rating >= 86) return "Master";
  if (rating >= 76) return "Diamond";
  if (rating >= 64) return "Platinum";
  if (rating >= 52) return "Gold";
  if (rating >= 40) return "Silver";
  return "Bronze";
};

export interface PublicPlayerCardData {
  profileKey: string;
  displayName: string;
  handle: string;
  bio: string;
  tier: string;
  tags: string[];
  avatar: string;
  photo: ProfilePhotoValue;
  publicProfile: boolean;
  showOnlineStatus: boolean;
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
  achievements: {
    total: number;
    unlocked: number;
    unlockedItems: AchievementProgressItem[];
    progressItems: AchievementProgressItem[];
  };
  saved: {
    factIds: string[];
    favoriteCategories: string[];
  };
  rankings: {
    triviaPower: { score: number; rank: string };
    triviaPrecision: { score: number; rank: string };
    triviaConsistency: { score: number; rank: string };
    battlePower: { score: number; rank: string };
    battleClutch: { score: number; rank: string };
    battleConsistency: { score: number; rank: string };
  };
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

  const [profileResponse, triviaResponse, battleResponse, triviaBoard, battleBoard, savedFactsResponse] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("profile_key, display_name, handle, bio, tier, tags, avatar_type, avatar_value, public_profile, show_online_status, updated_at")
      .eq("profile_key", profileKey)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("app_quiz_sessions")
      .select("category, difficulty, correct, total, points, best_streak, completed_at")
      .eq("profile_key", profileKey)
      .order("completed_at", { ascending: false })
      .limit(120)
      .returns<QuizSessionRow[]>(),
    supabase
      .from("app_battle_sessions")
      .select("mode, category, result, user_score, opponent_score, opponent_name, played_at")
      .eq("profile_key", profileKey)
      .order("played_at", { ascending: false })
      .limit(120)
      .returns<BattleSessionRow[]>(),
    fetchTriviaJourneyLeaderboard("global"),
    fetchBattleLeaderboard("global"),
    supabase
      .from("saved_facts")
      .select("fact_id, created_at")
      .eq("profile_id", profileKey)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<SavedFactRow[]>(),
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

  let runningWinStreak = 0;
  let bestWinStreak = 0;
  [...recentBattle]
    .reverse()
    .forEach((row) => {
      if (row.result === "win") {
        runningWinStreak += 1;
        bestWinStreak = Math.max(bestWinStreak, runningWinStreak);
      } else {
        runningWinStreak = 0;
      }
    });

  const triviaAvgPoints = triviaJourneys > 0 ? Math.round(triviaPoints / triviaJourneys) : 0;
  const triviaPowerRating = Math.round(Math.min(99, triviaAccuracy * 0.55 + Math.min(35, triviaBestStreak * 2) + Math.min(20, triviaJourneys * 0.8)));
  const triviaPrecisionRating = Math.round(Math.min(99, triviaAccuracy * 0.65 + Math.min(30, triviaAvgPoints / 22)));
  const triviaConsistencyRating = Math.round(Math.min(99, Math.min(55, triviaJourneys * 2) + Math.min(44, triviaBestStreak * 3.5)));
  const battlePowerRating = Math.round(Math.min(99, battleWinRate * 0.7 + Math.min(29, battleWins * 2.5)));
  const scoreDeltaPerMatch = battleMatches > 0 ? recentBattle.reduce((sum, row) => sum + (row.user_score - row.opponent_score), 0) / battleMatches : 0;
  const battleClutchRating = Math.round(Math.min(99, Math.max(0, 52 + scoreDeltaPerMatch * 7 + battleWinRate * 0.35)));
  const battleConsistencyRating = Math.round(Math.min(99, Math.min(60, battleMatches * 1.8) + Math.min(36, battleWinRate * 0.45)));

  const quizHistoryForAchievements: PlayerQuizHistoryItem[] = recentTrivia.map((row, index) => ({
    id: `${profileKey}-quiz-${index}`,
    category: row.category,
    difficulty: row.difficulty,
    questionCount: Math.max(0, row.total),
    correct: Math.max(0, row.correct),
    total: Math.max(0, row.total),
    passed: row.total > 0 ? row.correct / row.total >= 0.6 : false,
    points: Math.max(0, row.points),
    completedAt: row.completed_at,
  }));

  const achievementProgress = buildAchievementProgress({
    quizzesCompleted: triviaJourneys,
    totalCorrectAnswers: triviaCorrect,
    bestStreak: triviaBestStreak,
    totalPoints: triviaPoints,
    battlesPlayed: battleMatches,
    wins: battleWins,
    bestWinStreak,
    totalBattlePoints: battlePoints,
    quizHistory: quizHistoryForAchievements,
  });
  const unlockedAchievements = getUnlockedAchievements(achievementProgress);

  const savedFactIds =
    savedFactsResponse.error || !savedFactsResponse.data
      ? []
      : savedFactsResponse.data
          .map((item) => item.fact_id)
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  const favoriteCategories = [...recentTrivia]
    .reduce((acc, row) => {
      const key = row.category.trim();
      if (!key) return acc;
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
    .entries();

  const topCategories = Array.from(favoriteCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

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
    photo: {
      type: profile.avatar_type,
      value: profile.avatar_value,
    },
    publicProfile: Boolean(profile.public_profile),
    showOnlineStatus: Boolean(profile.show_online_status),
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
    recentTrivia: recentTrivia.slice(0, 12),
    recentBattle: recentBattle.slice(0, 12),
    achievements: {
      total: achievementProgress.length,
      unlocked: unlockedAchievements.length,
      unlockedItems: unlockedAchievements,
      progressItems: achievementProgress,
    },
    saved: {
      factIds: savedFactIds,
      favoriteCategories: topCategories,
    },
    rankings: {
      triviaPower: { score: triviaPowerRating, rank: ratingToRank(triviaPowerRating) },
      triviaPrecision: { score: triviaPrecisionRating, rank: ratingToRank(triviaPrecisionRating) },
      triviaConsistency: { score: triviaConsistencyRating, rank: ratingToRank(triviaConsistencyRating) },
      battlePower: { score: battlePowerRating, rank: ratingToRank(battlePowerRating) },
      battleClutch: { score: battleClutchRating, rank: ratingToRank(battleClutchRating) },
      battleConsistency: { score: battleConsistencyRating, rank: ratingToRank(battleConsistencyRating) },
    },
  };
};

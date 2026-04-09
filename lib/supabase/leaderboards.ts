"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { scoreBattlePoints } from "@/lib/battlePoints";

export type LeaderboardWindow = "global" | "daily" | "weekly";

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string;
  points: number;
  rank: number;
  rankLabel: string;
  accuracy: number;
  activityCount: number;
}

interface ProfileRow {
  profile_key: string;
  display_name: string;
  avatar_type: "initials" | "icon" | "image";
  avatar_value: string;
}

interface BattleRow {
  profile_key: string;
  result: "win" | "loss" | "draw";
  user_score: number;
  opponent_score: number;
  played_at: string;
}

interface QuizRow {
  profile_key: string;
  correct: number;
  total: number;
  points: number;
  completed_at: string;
}

const toRankLabel = (points: number, battle: boolean) => {
  if (battle) {
    if (points >= 9800) return "Legendary";
    if (points >= 8200) return "Expert";
    if (points >= 6400) return "Pro";
    return "Rising";
  }

  if (points >= 16000) return "Legendary";
  if (points >= 14500) return "Expert";
  if (points >= 12500) return "Pro";
  return "Rising";
};

const toSinceIso = (windowName: LeaderboardWindow) => {
  const now = Date.now();
  if (windowName === "daily") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (windowName === "weekly") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  return null;
};

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PL";

const profileAvatarToText = (profile: ProfileRow) => {
  if (profile.avatar_type === "initials" && profile.avatar_value?.trim()) {
    return profile.avatar_value.trim().slice(0, 3).toUpperCase();
  }
  return initialsFromName(profile.display_name);
};

const indexProfiles = (profiles: ProfileRow[]) => {
  const map = new Map<string, ProfileRow>();
  profiles.forEach((row) => {
    map.set(row.profile_key, row);
  });
  return map;
};

export const fetchBattleLeaderboard = async (windowName: LeaderboardWindow): Promise<LeaderboardEntry[]> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const sinceIso = toSinceIso(windowName);

  let battleQuery = supabase
    .from("app_battle_sessions")
    .select("profile_key, result, user_score, opponent_score, played_at")
    .returns<BattleRow[]>();

  if (sinceIso) {
    battleQuery = battleQuery.gte("played_at", sinceIso);
  }

  const [profilesResponse, battleResponse] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("profile_key, display_name, avatar_type, avatar_value")
      .returns<ProfileRow[]>(),
    battleQuery,
  ]);

  if (profilesResponse.error || !profilesResponse.data || battleResponse.error || !battleResponse.data) return [];

  const profilesByKey = indexProfiles(profilesResponse.data);
  const aggregate = new Map<
    string,
    {
      wins: number;
      battles: number;
      points: number;
    }
  >();

  battleResponse.data.forEach((row) => {
    const current = aggregate.get(row.profile_key) ?? { wins: 0, battles: 0, points: 0 };
    current.battles += 1;
    if (row.result === "win") current.wins += 1;
    current.points += scoreBattlePoints({ result: row.result, userScore: row.user_score, opponentScore: row.opponent_score });
    aggregate.set(row.profile_key, current);
  });

  return Array.from(aggregate.entries())
    .map(([profileKey, stats]) => {
      const profile = profilesByKey.get(profileKey);
      if (!profile) return null;

      const winRate = stats.battles > 0 ? Math.round((stats.wins / stats.battles) * 100) : 0;
      return {
        id: profileKey,
        username: profile.display_name,
        avatar: profileAvatarToText(profile),
        points: stats.points,
        rank: 0,
        rankLabel: toRankLabel(stats.points, true),
        accuracy: winRate,
        activityCount: stats.battles,
      } satisfies LeaderboardEntry;
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export const fetchTriviaJourneyLeaderboard = async (windowName: LeaderboardWindow): Promise<LeaderboardEntry[]> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const sinceIso = toSinceIso(windowName);

  let quizQuery = supabase
    .from("app_quiz_sessions")
    .select("profile_key, correct, total, points, completed_at")
    .returns<QuizRow[]>();

  if (sinceIso) {
    quizQuery = quizQuery.gte("completed_at", sinceIso);
  }

  const [profilesResponse, quizResponse] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("profile_key, display_name, avatar_type, avatar_value")
      .returns<ProfileRow[]>(),
    quizQuery,
  ]);

  if (profilesResponse.error || !profilesResponse.data || quizResponse.error || !quizResponse.data) return [];

  const profilesByKey = indexProfiles(profilesResponse.data);
  const aggregate = new Map<
    string,
    {
      correct: number;
      total: number;
      journeys: number;
      points: number;
    }
  >();

  quizResponse.data.forEach((row) => {
    const current = aggregate.get(row.profile_key) ?? { correct: 0, total: 0, journeys: 0, points: 0 };
    current.correct += Math.max(0, row.correct);
    current.total += Math.max(0, row.total);
    current.journeys += 1;
    current.points += Math.max(0, row.points);
    aggregate.set(row.profile_key, current);
  });

  return Array.from(aggregate.entries())
    .map(([profileKey, stats]) => {
      const profile = profilesByKey.get(profileKey);
      if (!profile) return null;

      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return {
        id: profileKey,
        username: profile.display_name,
        avatar: profileAvatarToText(profile),
        points: stats.points,
        rank: 0,
        rankLabel: toRankLabel(stats.points, false),
        accuracy,
        activityCount: stats.journeys,
      } satisfies LeaderboardEntry;
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { scoreBattlePoints } from "@/lib/battlePoints";

export type LeaderboardWindow = "global" | "daily" | "weekly";
export type LeaderboardMode = "social" | "active";

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
  public_profile: boolean;
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

type LegacyProfileRow = Record<string, unknown>;

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

const toFallbackPlayerName = (profileKey: string) => `Player ${profileKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "Unknown"}`;

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const asString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

const pickNumber = (row: LegacyProfileRow, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== undefined) return value;
  }
  return fallback;
};

const pickString = (row: LegacyProfileRow, keys: string[]) => {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return undefined;
};

export const fetchBattleLeaderboard = async (
  windowName: LeaderboardWindow,
  mode: LeaderboardMode = "social"
): Promise<LeaderboardEntry[]> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const sinceIso = toSinceIso(windowName);

  const battleQuery = supabase
    .from("app_battle_sessions")
    .select("profile_key, result, user_score, opponent_score, played_at");

  const scopedBattleQuery = sinceIso ? battleQuery.gte("played_at", sinceIso) : battleQuery;

  const [profilesResponse, battleResponse] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("profile_key, display_name, avatar_type, avatar_value, public_profile")
      .returns<ProfileRow[]>(),
    scopedBattleQuery,
  ]);

  const legacyProfilesResponse = await supabase.from("profiles").select("*").returns<LegacyProfileRow[]>();

  if (battleResponse.error || !battleResponse.data) return [];

  const profilesData = profilesResponse.data ?? [];
  const legacyProfilesData = legacyProfilesResponse.data ?? [];

  const battleRows = battleResponse.data as BattleRow[];
  const profilesByKey = new Map<string, ProfileRow>(profilesData.map((profile) => [profile.profile_key, profile]));
  const aggregate = new Map<
    string,
    {
      wins: number;
      battles: number;
      points: number;
    }
  >();

  battleRows.forEach((row) => {
    const current = aggregate.get(row.profile_key) ?? { wins: 0, battles: 0, points: 0 };
    current.battles += 1;
    if (row.result === "win") current.wins += 1;
    current.points += scoreBattlePoints({ result: row.result, userScore: row.user_score, opponentScore: row.opponent_score });
    aggregate.set(row.profile_key, current);
  });

  legacyProfilesData.forEach((row) => {
    const profileKey = pickString(row, ["id", "profile_key", "user_id"]);
    if (!profileKey) return;

    const legacyPoints = Math.max(
      0,
      pickNumber(row, ["battle_points", "total_battle_points", "battle_score", "pvp_points"])
    );
    const legacyBattles = Math.max(0, pickNumber(row, ["battles_played", "battle_count", "pvp_matches"]));
    const legacyWins = Math.max(0, pickNumber(row, ["wins", "battle_wins", "pvp_wins"]));

    const current = aggregate.get(profileKey) ?? { wins: 0, battles: 0, points: 0 };
    current.points += legacyPoints;
    current.battles += legacyBattles;
    current.wins += Math.min(legacyWins, current.battles);
    aggregate.set(profileKey, current);

    if (!profilesByKey.has(profileKey)) {
      profilesByKey.set(profileKey, {
        profile_key: profileKey,
        display_name: pickString(row, ["username", "display_name", "handle"]) ?? toFallbackPlayerName(profileKey),
        avatar_type: "initials",
        avatar_value: initialsFromName(pickString(row, ["username", "display_name", "handle"]) ?? profileKey),
        public_profile: true,
      });
    }
  });

  const candidateKeys =
    mode === "active"
      ? Array.from(aggregate.keys())
      : Array.from(new Set([...profilesByKey.keys(), ...aggregate.keys()]));

  return candidateKeys
    .map((profileKey) => {
      const profile = profilesByKey.get(profileKey);
      const stats = aggregate.get(profileKey) ?? { wins: 0, battles: 0, points: 0 };

      if (mode === "active" && stats.battles < 1) {
        return null;
      }

      const winRate = stats.battles > 0 ? Math.round((stats.wins / stats.battles) * 100) : 0;
      return {
        id: profileKey,
        username: profile?.display_name ?? toFallbackPlayerName(profileKey),
        avatar: profile ? profileAvatarToText(profile) : "PL",
        points: stats.points,
        rank: 0,
        rankLabel: toRankLabel(stats.points, true),
        accuracy: winRate,
        activityCount: stats.battles,
      } satisfies LeaderboardEntry;
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return a.username.localeCompare(b.username);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export const fetchTriviaJourneyLeaderboard = async (
  windowName: LeaderboardWindow,
  mode: LeaderboardMode = "social"
): Promise<LeaderboardEntry[]> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const sinceIso = toSinceIso(windowName);

  const quizQuery = supabase
    .from("app_quiz_sessions")
    .select("profile_key, correct, total, points, completed_at");

  const scopedQuizQuery = sinceIso ? quizQuery.gte("completed_at", sinceIso) : quizQuery;

  const [profilesResponse, quizResponse] = await Promise.all([
    supabase
      .from("app_user_profiles")
      .select("profile_key, display_name, avatar_type, avatar_value, public_profile")
      .returns<ProfileRow[]>(),
    scopedQuizQuery,
  ]);

  const legacyProfilesResponse = await supabase.from("profiles").select("*").returns<LegacyProfileRow[]>();

  if (quizResponse.error || !quizResponse.data) return [];

  const profilesData = profilesResponse.data ?? [];
  const legacyProfilesData = legacyProfilesResponse.data ?? [];

  const quizRows = quizResponse.data as QuizRow[];
  const profilesByKey = new Map<string, ProfileRow>(profilesData.map((profile) => [profile.profile_key, profile]));
  const aggregate = new Map<
    string,
    {
      correct: number;
      total: number;
      journeys: number;
      points: number;
    }
  >();

  quizRows.forEach((row) => {
    const current = aggregate.get(row.profile_key) ?? { correct: 0, total: 0, journeys: 0, points: 0 };
    current.correct += Math.max(0, row.correct);
    current.total += Math.max(0, row.total);
    current.journeys += 1;
    current.points += Math.max(0, row.points);
    aggregate.set(row.profile_key, current);
  });

  legacyProfilesData.forEach((row) => {
    const profileKey = pickString(row, ["id", "profile_key", "user_id"]);
    if (!profileKey) return;

    const legacyPoints = Math.max(0, pickNumber(row, ["score", "points", "total_points", "trivia_points"]));
    const legacyAccuracy = Math.max(0, Math.min(100, pickNumber(row, ["accuracy", "trivia_accuracy"], 0)));
    const legacyQuizCount = Math.max(0, pickNumber(row, ["quiz_count", "quizzes_completed", "total_quizzes"]));
    const estimatedTotal = legacyQuizCount * 10;
    const estimatedCorrect = Math.round((legacyAccuracy / 100) * estimatedTotal);

    const current = aggregate.get(profileKey) ?? { correct: 0, total: 0, journeys: 0, points: 0 };
    current.points += legacyPoints;
    current.journeys += legacyQuizCount;
    current.total += estimatedTotal;
    current.correct += estimatedCorrect;
    aggregate.set(profileKey, current);

    if (!profilesByKey.has(profileKey)) {
      profilesByKey.set(profileKey, {
        profile_key: profileKey,
        display_name: pickString(row, ["username", "display_name", "handle"]) ?? toFallbackPlayerName(profileKey),
        avatar_type: "initials",
        avatar_value: initialsFromName(pickString(row, ["username", "display_name", "handle"]) ?? profileKey),
        public_profile: true,
      });
    }
  });

  const candidateKeys =
    mode === "active"
      ? Array.from(aggregate.keys())
      : Array.from(new Set([...profilesByKey.keys(), ...aggregate.keys()]));

  return candidateKeys
    .map((profileKey) => {
      const profile = profilesByKey.get(profileKey);
      const stats = aggregate.get(profileKey) ?? { correct: 0, total: 0, journeys: 0, points: 0 };

      if (mode === "active" && stats.journeys < 1) {
        return null;
      }

      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return {
        id: profileKey,
        username: profile?.display_name ?? toFallbackPlayerName(profileKey),
        avatar: profile ? profileAvatarToText(profile) : "PL",
        points: stats.points,
        rank: 0,
        rankLabel: toRankLabel(stats.points, false),
        accuracy,
        activityCount: stats.journeys,
      } satisfies LeaderboardEntry;
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return a.username.localeCompare(b.username);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

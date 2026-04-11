"use client";

import type { ProfilePhotoValue } from "@/lib/profilePhotoStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getActiveProfileKey } from "@/lib/supabase/profileKey";

export const LOCAL_BATTLE_SESSIONS_KEY = "local-battle-sessions";

let isBattleSessionsTableMissing = false;
let isBattleQueueTableMissing = false;

const BATTLE_QUEUE_STALE_WINDOW_MS = 90_000;

interface AppUserProfileBattleRow {
  profile_key: string;
  display_name: string;
  tier: string;
  avatar_type: ProfilePhotoValue["type"];
  avatar_value: string;
}

interface AppBattleQueueRow {
  profile_key: string;
  display_name: string;
  tier: string;
  avatar_type: ProfilePhotoValue["type"];
  avatar_value: string;
  mode: string;
  category: string;
  joined_at: string;
  heartbeat_at: string;
  queue_state: "searching" | "matched";
  match_token: string | null;
  match_starts_at: string | null;
  match_ready_at: string | null;
  opponent_profile_key: string | null;
  opponent_display_name: string | null;
  opponent_tier: string | null;
  opponent_avatar_type: ProfilePhotoValue["type"] | null;
  opponent_avatar_value: string | null;
  surrendered: boolean;
  surrendered_by_profile_key: string | null;
  live_score: number | null;
  final_score: number | null;
  finished_at: string | null;
}

interface AppBattleMatchScoreRow {
  profile_key: string;
  live_score: number | null;
  final_score: number | null;
  finished_at: string | null;
  surrendered: boolean;
  surrendered_by_profile_key: string | null;
  live_accuracy: number | null;
  live_streak: number | null;
  match_ready_at: string | null;
}

export interface BattleOpponentCandidate {
  profileKey: string;
  username: string;
  tier: string;
  photo: ProfilePhotoValue;
}

export interface BattleSessionPayload {
  mode: string;
  category: string;
  result: "win" | "loss" | "draw";
  userScore: number;
  opponentScore: number;
  opponentName: string;
}

export interface BattleQueueUpsertPayload {
  mode: string;
  category: string;
  displayName: string;
  tier: string;
  photo: ProfilePhotoValue;
  forceSearchReset?: boolean;
}

export interface BattleQueueEntry {
  profileKey: string;
  username: string;
  tier: string;
  photo: ProfilePhotoValue;
  mode: string;
  category: string;
  waitingSeconds: number;
}

export interface BattleQueueProfileSnapshot {
  profileKey: string;
  username: string;
  tier: string;
  photo: ProfilePhotoValue;
}

export interface BattleQueueOwnState {
  profileKey: string;
  mode: string;
  category: string;
  queueState: "searching" | "matched";
  matchToken: string | null;
  matchStartsAt: string | null;
  matchReadyAt: string | null;
  surrendered: boolean;
  surrenderedByProfileKey: string | null;
  liveScore: number | null;
  finalScore: number | null;
  finishedAt: string | null;
  opponentProfileKey: string | null;
  opponent: BattleQueueProfileSnapshot | null;
}

export interface BattleQueueMatchResult {
  matchToken: string;
  matchStartsAt: string;
}

export interface BattleMatchScoreState {
  selfProfileKey: string;
  opponentPresent: boolean;
  selfLiveScore: number;
  opponentLiveScore: number;
  selfLiveAccuracy: number;
  opponentLiveAccuracy: number;
  selfLiveStreak: number;
  opponentLiveStreak: number;
  selfFinished: boolean;
  selfScore: number | null;
  opponentFinished: boolean;
  opponentScore: number | null;
  surrendered: boolean;
  surrenderedByProfileKey: string | null;
  selfReady: boolean;
  opponentReady: boolean;
}

export interface BattleQuestionsRecord {
  questions: PreparedBattleQuestion[];
  category: string;
  mode: string;
  questionCount: number;
}

export interface PreparedBattleQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  picsWord?: {
    targetWord: string;
    letterBank: string[];
    imageUrls: string[];
    clue: string;
  };
}

const isMissingBattleQueueTableError = (message: string) =>
  /app_battle_queue/i.test(message) && /schema cache|could not find the table/i.test(message);

const isMissingBattleReadyColumnError = (message: string) =>
  /match_ready_at/i.test(message) && /schema cache|could not find the column|column .* does not exist/i.test(message);

const toQueueEntry = (row: AppBattleQueueRow): BattleQueueEntry => {
  const joinedAt = Number(new Date(row.joined_at));
  const waitingSeconds = Number.isFinite(joinedAt)
    ? Math.max(0, Math.floor((Date.now() - joinedAt) / 1000))
    : 0;

  return {
    profileKey: row.profile_key,
    username: row.display_name || "Player",
    tier: row.tier || "Rookie",
    photo: {
      type: row.avatar_type || "initials",
      value: row.avatar_value || (row.display_name ? row.display_name.slice(0, 2).toUpperCase() : "PL"),
    },
    mode: row.mode,
    category: row.category,
    waitingSeconds,
  };
};

const toOwnQueueState = (row: AppBattleQueueRow): BattleQueueOwnState => ({
  profileKey: row.profile_key,
  mode: row.mode,
  category: row.category,
  queueState: row.queue_state,
  matchToken: row.match_token,
  matchStartsAt: row.match_starts_at,
  matchReadyAt: row.match_ready_at,
  surrendered: row.surrendered,
  surrenderedByProfileKey: row.surrendered_by_profile_key,
  liveScore: row.live_score,
  finalScore: row.final_score,
  finishedAt: row.finished_at,
  opponentProfileKey: row.opponent_profile_key,
  opponent: row.opponent_profile_key
    ? {
        profileKey: row.opponent_profile_key,
        username: row.opponent_display_name || "Opponent",
        tier: row.opponent_tier || "Rookie",
        photo: {
          type: row.opponent_avatar_type || "initials",
          value: row.opponent_avatar_value || "OP",
        },
      }
    : null,
});

const persistBattleSessionLocally = (payload: BattleSessionPayload) => {
  if (typeof window === "undefined") return;

  const existingRaw = window.localStorage.getItem(LOCAL_BATTLE_SESSIONS_KEY);
  const existing = existingRaw ? (JSON.parse(existingRaw) as Array<BattleSessionPayload & { playedAt: string }>) : [];

  existing.push({ ...payload, playedAt: new Date().toISOString() });
  window.localStorage.setItem(LOCAL_BATTLE_SESSIONS_KEY, JSON.stringify(existing.slice(-100)));
};

export const loadBattleOpponentsFromSupabase = async (): Promise<BattleOpponentCandidate[]> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const profileKey = await getActiveProfileKey();

  const { data, error } = await supabase
    .from("app_user_profiles")
    .select("profile_key, display_name, tier, avatar_type, avatar_value")
    .neq("profile_key", profileKey)
    .limit(25)
    .returns<AppUserProfileBattleRow[]>();

  if (error || !data) return [];

  return data
    .filter((row) => row.display_name)
    .map((row) => ({
      profileKey: row.profile_key,
      username: row.display_name,
      tier: row.tier,
      photo: {
        type: row.avatar_type,
        value: row.avatar_value,
      },
    }));
};

export const upsertBattleQueueEntryInSupabase = async (payload: BattleQueueUpsertPayload) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return;

  const profileKey = await getActiveProfileKey();
  const nowIso = new Date().toISOString();

  const existingState = await supabase
    .from("app_battle_queue")
    .select("queue_state, match_token")
    .eq("profile_key", profileKey)
    .maybeSingle<{ queue_state: "searching" | "matched"; match_token: string | null }>();

  if (!payload.forceSearchReset && !existingState.error && existingState.data?.queue_state === "matched" && existingState.data.match_token) {
    // Preserve a live match row; only refresh profile metadata and heartbeat.
    const { error: matchedUpdateError } = await supabase
      .from("app_battle_queue")
      .update({
        mode: payload.mode,
        category: payload.category,
        display_name: payload.displayName,
        tier: payload.tier,
        avatar_type: payload.photo.type,
        avatar_value: payload.photo.value,
        heartbeat_at: nowIso,
      })
      .eq("profile_key", profileKey);

    if (!matchedUpdateError) return;

    if (isMissingBattleQueueTableError(matchedUpdateError.message)) {
      isBattleQueueTableMissing = true;
      console.warn("Battle queue table is missing in Supabase. Run the migration to enable live queue matchmaking.");
      return;
    }

    console.warn("Unable to update matched battle queue entry", matchedUpdateError.message);
    return;
  }

  const queueRow = {
    profile_key: profileKey,
    mode: payload.mode,
    category: payload.category,
    display_name: payload.displayName,
    tier: payload.tier,
    avatar_type: payload.photo.type,
    avatar_value: payload.photo.value,
    joined_at: nowIso,
    heartbeat_at: nowIso,
    searching: true,
    queue_state: "searching",
    match_token: null,
    match_starts_at: null,
    opponent_profile_key: null,
    opponent_display_name: null,
    opponent_tier: null,
    opponent_avatar_type: null,
    opponent_avatar_value: null,
    surrendered: false,
    surrendered_by_profile_key: null,
    match_ready_at: null,
    live_score: 0,
    live_accuracy: 0,
    live_streak: 0,
    final_score: null,
    finished_at: null,
  };

  const { error } = await supabase.from("app_battle_queue").upsert(queueRow, { onConflict: "profile_key" });

  if (!error) return;

  if (isMissingBattleReadyColumnError(error.message)) {
    const { error: fallbackError } = await supabase.from("app_battle_queue").upsert(
      {
        profile_key: profileKey,
        mode: payload.mode,
        category: payload.category,
        display_name: payload.displayName,
        tier: payload.tier,
        avatar_type: payload.photo.type,
        avatar_value: payload.photo.value,
        joined_at: nowIso,
        heartbeat_at: nowIso,
        searching: true,
        queue_state: "searching",
        match_token: null,
        match_starts_at: null,
        opponent_profile_key: null,
        opponent_display_name: null,
        opponent_tier: null,
        opponent_avatar_type: null,
        opponent_avatar_value: null,
        surrendered: false,
        surrendered_by_profile_key: null,
        live_score: 0,
        live_accuracy: 0,
        live_streak: 0,
        final_score: null,
        finished_at: null,
      },
      { onConflict: "profile_key" }
    );

    if (!fallbackError) return;

    if (isMissingBattleQueueTableError(fallbackError.message)) {
      isBattleQueueTableMissing = true;
      console.warn("Battle queue table is missing in Supabase. Run the migration to enable live queue matchmaking.");
      return;
    }

    console.warn("Unable to upsert battle queue entry", fallbackError.message);
    return;
  }

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    console.warn("Battle queue table is missing in Supabase. Run the migration to enable live queue matchmaking.");
    return;
  }

  console.warn("Unable to upsert battle queue entry", error.message);
};

export const heartbeatBattleQueueEntryInSupabase = async (payload: Pick<BattleQueueUpsertPayload, "mode" | "category">) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return;

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase
    .from("app_battle_queue")
    .update({
      mode: payload.mode,
      category: payload.category,
      heartbeat_at: new Date().toISOString(),
    })
    .eq("profile_key", profileKey);

  if (!error) return;

  if (isMissingBattleReadyColumnError(error.message)) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to heartbeat battle queue entry", error.message);
};

export const removeBattleQueueEntryFromSupabase = async () => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return;

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase.from("app_battle_queue").delete().eq("profile_key", profileKey);

  if (!error) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to remove battle queue entry", error.message);
};

export const loadBattleQueueFromSupabase = async (mode: string, category: string): Promise<BattleQueueEntry[]> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return [];

  const profileKey = await getActiveProfileKey();
  const staleCutoffIso = new Date(Date.now() - BATTLE_QUEUE_STALE_WINDOW_MS).toISOString();

  const queryColumns = "profile_key, display_name, tier, avatar_type, avatar_value, mode, category, joined_at, heartbeat_at, queue_state, match_token, match_starts_at, match_ready_at, opponent_profile_key, opponent_display_name, opponent_tier, opponent_avatar_type, opponent_avatar_value, surrendered, surrendered_by_profile_key, live_score, live_accuracy, live_streak, final_score, finished_at";

  const { data, error } = await supabase
    .from("app_battle_queue")
    .select(queryColumns)
    .eq("searching", true)
    .eq("queue_state", "searching")
    .eq("mode", mode)
    .eq("category", category)
    .eq("surrendered", false)
    .neq("profile_key", profileKey)
    .gte("heartbeat_at", staleCutoffIso)
    .order("joined_at", { ascending: true })
    .limit(24)
    .returns<AppBattleQueueRow[]>();

  if (!error && data) {
    return data.map(toQueueEntry);
  }

  if (error && isMissingBattleReadyColumnError(error.message)) {
    const fallbackColumns = "profile_key, display_name, tier, avatar_type, avatar_value, mode, category, joined_at, heartbeat_at, queue_state, match_token, match_starts_at, opponent_profile_key, opponent_display_name, opponent_tier, opponent_avatar_type, opponent_avatar_value, surrendered, surrendered_by_profile_key, live_score, live_accuracy, live_streak, final_score, finished_at";
    const fallback = await supabase
      .from("app_battle_queue")
      .select(fallbackColumns)
      .eq("searching", true)
      .eq("queue_state", "searching")
      .eq("mode", mode)
      .eq("category", category)
      .eq("surrendered", false)
      .neq("profile_key", profileKey)
      .gte("heartbeat_at", staleCutoffIso)
      .order("joined_at", { ascending: true })
      .limit(24)
      .returns<AppBattleQueueRow[]>();

    if (!fallback.error && fallback.data) {
      return fallback.data.map(toQueueEntry);
    }

    if (fallback.error && isMissingBattleQueueTableError(fallback.error.message)) {
      isBattleQueueTableMissing = true;
      return [];
    }

    if (fallback.error) {
      console.warn("Unable to load battle queue", fallback.error.message);
    }

    return [];
  }

  if (error && isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return [];
  }

  if (error) {
    console.warn("Unable to load battle queue", error.message);
  }

  return [];
};

export const loadOwnBattleQueueStateFromSupabase = async (): Promise<BattleQueueOwnState | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return null;

  const profileKey = await getActiveProfileKey();
  const queryColumns = "profile_key, display_name, tier, avatar_type, avatar_value, mode, category, joined_at, heartbeat_at, queue_state, match_token, match_starts_at, match_ready_at, opponent_profile_key, opponent_display_name, opponent_tier, opponent_avatar_type, opponent_avatar_value, surrendered, surrendered_by_profile_key, live_score, live_accuracy, live_streak, final_score, finished_at";

  const { data, error } = await supabase
    .from("app_battle_queue")
    .select(queryColumns)
    .eq("profile_key", profileKey)
    .maybeSingle<AppBattleQueueRow>();

  if (!error && data) return toOwnQueueState(data);

  if (error && isMissingBattleReadyColumnError(error.message)) {
    const fallbackColumns = "profile_key, display_name, tier, avatar_type, avatar_value, mode, category, joined_at, heartbeat_at, queue_state, match_token, match_starts_at, opponent_profile_key, opponent_display_name, opponent_tier, opponent_avatar_type, opponent_avatar_value, surrendered, surrendered_by_profile_key, live_score, live_accuracy, live_streak, final_score, finished_at";
    const fallback = await supabase
      .from("app_battle_queue")
      .select(fallbackColumns)
      .eq("profile_key", profileKey)
      .maybeSingle<AppBattleQueueRow>();

    if (!fallback.error && fallback.data) return toOwnQueueState(fallback.data);

    if (fallback.error && isMissingBattleQueueTableError(fallback.error.message)) {
      isBattleQueueTableMissing = true;
      return null;
    }

    if (fallback.error) {
      console.warn("Unable to load own battle queue state", fallback.error.message);
    }

    return null;
  }

  if (error && isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return null;
  }

  if (error) {
    console.warn("Unable to load own battle queue state", error.message);
  }

  return null;
};

const buildMatchToken = (firstProfileKey: string, secondProfileKey: string) => {
  const ordered = [firstProfileKey, secondProfileKey].sort();
  return `${ordered[0]}:${ordered[1]}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
};

export const createBattleQueueMatchInSupabase = async (args: {
  mode: string;
  category: string;
  opponent: BattleQueueProfileSnapshot;
  selfSnapshot: Omit<BattleQueueProfileSnapshot, "profileKey">;
}): Promise<BattleQueueMatchResult | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return null;

  const profileKey = await getActiveProfileKey();

  const matchToken = buildMatchToken(profileKey, args.opponent.profileKey);
  const startsAtIso = new Date(Date.now() + 5000).toISOString();
  const heartbeatAt = new Date().toISOString();

  const resolveExistingMatchForSelf = async (): Promise<BattleQueueMatchResult | null> => {
    const ownState = await loadOwnBattleQueueStateFromSupabase();
    if (ownState?.queueState === "matched" && ownState.matchToken && ownState.matchStartsAt) {
      return {
        matchToken: ownState.matchToken,
        matchStartsAt: ownState.matchStartsAt,
      };
    }

    return null;
  };

  const rollbackOpponentMatchAttempt = async () => {
    const { error } = await supabase
      .from("app_battle_queue")
      .update({
        queue_state: "searching",
        searching: true,
        match_token: null,
        match_starts_at: null,
        opponent_profile_key: null,
        opponent_display_name: null,
        opponent_tier: null,
        opponent_avatar_type: null,
        opponent_avatar_value: null,
        match_ready_at: null,
        heartbeat_at: new Date().toISOString(),
      })
      .eq("profile_key", args.opponent.profileKey)
      .eq("match_token", matchToken)
      .eq("opponent_profile_key", profileKey);

    if (!error) return;
    if (isMissingBattleReadyColumnError(error.message)) {
      const fallback = await supabase
        .from("app_battle_queue")
        .update({
          queue_state: "searching",
          searching: true,
          match_token: null,
          match_starts_at: null,
          opponent_profile_key: null,
          opponent_display_name: null,
          opponent_tier: null,
          opponent_avatar_type: null,
          opponent_avatar_value: null,
          heartbeat_at: new Date().toISOString(),
        })
        .eq("profile_key", args.opponent.profileKey)
        .eq("match_token", matchToken)
        .eq("opponent_profile_key", profileKey);

      if (!fallback.error) return;
      console.warn("Unable to rollback unilateral opponent match row", fallback.error.message);
      return;
    }

    console.warn("Unable to rollback unilateral opponent match row", error.message);
  };

  const { data: opponentRows, error: opponentError } = await supabase
    .from("app_battle_queue")
    .update({
      queue_state: "matched",
      searching: true,
      match_token: matchToken,
      match_starts_at: startsAtIso,
      opponent_profile_key: profileKey,
      opponent_display_name: args.selfSnapshot.username,
      opponent_tier: args.selfSnapshot.tier,
      opponent_avatar_type: args.selfSnapshot.photo.type,
      opponent_avatar_value: args.selfSnapshot.photo.value,
      surrendered: false,
      surrendered_by_profile_key: null,
      match_ready_at: null,
      live_score: 0,
      live_accuracy: 0,
      live_streak: 0,
      final_score: null,
      finished_at: null,
      heartbeat_at: heartbeatAt,
    })
    .eq("profile_key", args.opponent.profileKey)
    .eq("queue_state", "searching")
    .eq("searching", true)
    .eq("mode", args.mode)
    .eq("category", args.category)
    .eq("surrendered", false)
    .select("profile_key");

  if (opponentError) {
    if (isMissingBattleReadyColumnError(opponentError.message)) {
      const fallbackOpponentRows = await supabase
        .from("app_battle_queue")
        .update({
          queue_state: "matched",
          searching: true,
          match_token: matchToken,
          match_starts_at: startsAtIso,
          opponent_profile_key: profileKey,
          opponent_display_name: args.selfSnapshot.username,
          opponent_tier: args.selfSnapshot.tier,
          opponent_avatar_type: args.selfSnapshot.photo.type,
          opponent_avatar_value: args.selfSnapshot.photo.value,
          surrendered: false,
          surrendered_by_profile_key: null,
          live_score: 0,
          live_accuracy: 0,
          live_streak: 0,
          final_score: null,
          finished_at: null,
          heartbeat_at: heartbeatAt,
        })
        .eq("profile_key", args.opponent.profileKey)
        .eq("queue_state", "searching")
        .eq("searching", true)
        .eq("mode", args.mode)
        .eq("category", args.category)
        .eq("surrendered", false)
        .select("profile_key");

      if (fallbackOpponentRows.error) {
        console.warn("Unable to create queue match against opponent", fallbackOpponentRows.error.message);
        return null;
      }

      if (!fallbackOpponentRows.data || !fallbackOpponentRows.data.length) return null;

      const fallbackSelf = await supabase
        .from("app_battle_queue")
        .update({
          queue_state: "matched",
          searching: true,
          match_token: matchToken,
          match_starts_at: startsAtIso,
          opponent_profile_key: args.opponent.profileKey,
          opponent_display_name: args.opponent.username,
          opponent_tier: args.opponent.tier,
          opponent_avatar_type: args.opponent.photo.type,
          opponent_avatar_value: args.opponent.photo.value,
          surrendered: false,
          surrendered_by_profile_key: null,
          live_score: 0,
          live_accuracy: 0,
          live_streak: 0,
          final_score: null,
          finished_at: null,
          heartbeat_at: heartbeatAt,
        })
        .eq("profile_key", profileKey)
        .eq("queue_state", "searching")
        .is("match_token", null)
        .select("profile_key");

      if (fallbackSelf.error) {
        console.warn("Unable to update own queue row after creating match", fallbackSelf.error.message);
        await rollbackOpponentMatchAttempt();
        return resolveExistingMatchForSelf();
      }

      if (!fallbackSelf.data || !fallbackSelf.data.length) {
        await rollbackOpponentMatchAttempt();
        return resolveExistingMatchForSelf();
      }

      return {
        matchToken,
        matchStartsAt: startsAtIso,
      };
    }

    if (isMissingBattleQueueTableError(opponentError.message)) {
      isBattleQueueTableMissing = true;
      return null;
    }
    console.warn("Unable to create queue match against opponent", opponentError.message);
    return null;
  }

  if (!opponentRows || !opponentRows.length) {
    return resolveExistingMatchForSelf();
  }

  const { data: selfRows, error: selfError } = await supabase
    .from("app_battle_queue")
    .update({
      queue_state: "matched",
      searching: true,
      match_token: matchToken,
      match_starts_at: startsAtIso,
      opponent_profile_key: args.opponent.profileKey,
      opponent_display_name: args.opponent.username,
      opponent_tier: args.opponent.tier,
      opponent_avatar_type: args.opponent.photo.type,
      opponent_avatar_value: args.opponent.photo.value,
      surrendered: false,
      surrendered_by_profile_key: null,
      match_ready_at: null,
      live_score: 0,
      live_accuracy: 0,
      live_streak: 0,
      final_score: null,
      finished_at: null,
      heartbeat_at: heartbeatAt,
    })
    .eq("profile_key", profileKey)
    .eq("queue_state", "searching")
    .is("match_token", null)
    .select("profile_key");

  if (selfError) {
    if (isMissingBattleReadyColumnError(selfError.message)) {
      const fallbackSelf = await supabase
        .from("app_battle_queue")
        .update({
          queue_state: "matched",
          searching: true,
          match_token: matchToken,
          match_starts_at: startsAtIso,
          opponent_profile_key: args.opponent.profileKey,
          opponent_display_name: args.opponent.username,
          opponent_tier: args.opponent.tier,
          opponent_avatar_type: args.opponent.photo.type,
          opponent_avatar_value: args.opponent.photo.value,
          surrendered: false,
          surrendered_by_profile_key: null,
          live_score: 0,
          live_accuracy: 0,
          live_streak: 0,
          final_score: null,
          finished_at: null,
          heartbeat_at: heartbeatAt,
        })
        .eq("profile_key", profileKey)
        .eq("queue_state", "searching")
        .is("match_token", null)
        .select("profile_key");

      if (fallbackSelf.error) {
        console.warn("Unable to update own queue row after creating match", fallbackSelf.error.message);
        await rollbackOpponentMatchAttempt();
        return resolveExistingMatchForSelf();
      }

      if (!fallbackSelf.error && (!fallbackSelf.data || !fallbackSelf.data.length)) {
        await rollbackOpponentMatchAttempt();
        return resolveExistingMatchForSelf();
      }

      return {
        matchToken,
        matchStartsAt: startsAtIso,
      };
    }

    console.warn("Unable to update own queue row after creating match", selfError.message);
    await rollbackOpponentMatchAttempt();
    return resolveExistingMatchForSelf();
  }

  if (!selfRows || !selfRows.length) {
    await rollbackOpponentMatchAttempt();
    return resolveExistingMatchForSelf();
  }

  return {
    matchToken,
    matchStartsAt: startsAtIso,
  };
};

export const restartBattleQueueMatchInSupabase = async (matchToken: string): Promise<BattleQueueMatchResult | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing || !matchToken) return null;

  const profileKey = await getActiveProfileKey();
  const { data: ownRow, error } = await supabase
    .from("app_battle_queue")
    .select(
      "profile_key, mode, category, display_name, tier, avatar_type, avatar_value, opponent_profile_key, opponent_display_name, opponent_tier, opponent_avatar_type, opponent_avatar_value, queue_state, match_token"
    )
    .eq("profile_key", profileKey)
    .eq("match_token", matchToken)
    .maybeSingle<
      Pick<
        AppBattleQueueRow,
        | "profile_key"
        | "mode"
        | "category"
        | "display_name"
        | "tier"
        | "avatar_type"
        | "avatar_value"
        | "opponent_profile_key"
        | "opponent_display_name"
        | "opponent_tier"
        | "opponent_avatar_type"
        | "opponent_avatar_value"
        | "queue_state"
        | "match_token"
      >
    >();

  if (error) {
    if (isMissingBattleQueueTableError(error.message)) {
      isBattleQueueTableMissing = true;
      return null;
    }

    console.warn("Unable to read battle queue row for rematch", error.message);
    return null;
  }

  if (!ownRow?.opponent_profile_key) return null;
  if (profileKey >= ownRow.opponent_profile_key) return null;

  const newMatchToken = buildMatchToken(profileKey, ownRow.opponent_profile_key);
  const startsAtIso = new Date(Date.now() + 5000).toISOString();
  const heartbeatAt = new Date().toISOString();

  const resetPayload = {
    queue_state: "matched" as const,
    searching: true,
    match_token: newMatchToken,
    match_starts_at: startsAtIso,
    match_ready_at: null,
    surrendered: false,
    surrendered_by_profile_key: null,
    live_score: 0,
    live_accuracy: 0,
    live_streak: 0,
    final_score: null,
    finished_at: null,
    heartbeat_at: heartbeatAt,
  };

  const { error: opponentError } = await supabase
    .from("app_battle_queue")
    .update({
      ...resetPayload,
      mode: ownRow.mode,
      category: ownRow.category,
      opponent_profile_key: profileKey,
      opponent_display_name: ownRow.display_name,
      opponent_tier: ownRow.tier,
      opponent_avatar_type: ownRow.avatar_type,
      opponent_avatar_value: ownRow.avatar_value,
    })
    .eq("profile_key", ownRow.opponent_profile_key)
    .eq("match_token", matchToken);

  if (opponentError) {
    if (isMissingBattleReadyColumnError(opponentError.message)) {
      const fallbackOpponent = await supabase
        .from("app_battle_queue")
        .update({
          queue_state: "matched",
          searching: true,
          match_token: newMatchToken,
          match_starts_at: startsAtIso,
          surrendered: false,
          surrendered_by_profile_key: null,
          live_score: 0,
          live_accuracy: 0,
          live_streak: 0,
          final_score: null,
          finished_at: null,
          heartbeat_at: heartbeatAt,
          mode: ownRow.mode,
          category: ownRow.category,
          opponent_profile_key: profileKey,
          opponent_display_name: ownRow.display_name,
          opponent_tier: ownRow.tier,
          opponent_avatar_type: ownRow.avatar_type,
          opponent_avatar_value: ownRow.avatar_value,
        })
        .eq("profile_key", ownRow.opponent_profile_key)
        .eq("match_token", matchToken);

      if (fallbackOpponent.error) {
        console.warn("Unable to restart rematch opponent row", fallbackOpponent.error.message);
        return null;
      }
    } else {
      console.warn("Unable to restart rematch opponent row", opponentError.message);
      return null;
    }
  }

  const { error: selfError } = await supabase
    .from("app_battle_queue")
    .update({
      ...resetPayload,
      mode: ownRow.mode,
      category: ownRow.category,
      opponent_profile_key: ownRow.opponent_profile_key,
      opponent_display_name: ownRow.opponent_display_name,
      opponent_tier: ownRow.opponent_tier,
      opponent_avatar_type: ownRow.opponent_avatar_type,
      opponent_avatar_value: ownRow.opponent_avatar_value,
    })
    .eq("profile_key", profileKey)
    .eq("match_token", matchToken);

  if (selfError) {
    if (isMissingBattleReadyColumnError(selfError.message)) {
      const fallbackSelf = await supabase
        .from("app_battle_queue")
        .update({
          queue_state: "matched",
          searching: true,
          match_token: newMatchToken,
          match_starts_at: startsAtIso,
          surrendered: false,
          surrendered_by_profile_key: null,
          live_score: 0,
          live_accuracy: 0,
          live_streak: 0,
          final_score: null,
          finished_at: null,
          heartbeat_at: heartbeatAt,
          mode: ownRow.mode,
          category: ownRow.category,
          opponent_profile_key: ownRow.opponent_profile_key,
          opponent_display_name: ownRow.opponent_display_name,
          opponent_tier: ownRow.opponent_tier,
          opponent_avatar_type: ownRow.opponent_avatar_type,
          opponent_avatar_value: ownRow.opponent_avatar_value,
        })
        .eq("profile_key", profileKey)
        .eq("match_token", matchToken);

      if (fallbackSelf.error) {
        console.warn("Unable to restart rematch self row", fallbackSelf.error.message);
        return null;
      }
    } else {
      console.warn("Unable to restart rematch self row", selfError.message);
      return null;
    }
  }

  return {
    matchToken: newMatchToken,
    matchStartsAt: startsAtIso,
  };
};

export const markBattleQueueSurrenderInSupabase = async (): Promise<string | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return null;

  const profileKey = await getActiveProfileKey();
  const { data: ownRow, error: ownError } = await supabase
    .from("app_battle_queue")
    .select("match_token")
    .eq("profile_key", profileKey)
    .maybeSingle<{ match_token: string | null }>();

  if (ownError) {
    if (isMissingBattleQueueTableError(ownError.message)) {
      isBattleQueueTableMissing = true;
      return null;
    }
    console.warn("Unable to read own battle queue row before surrender", ownError.message);
    return null;
  }

  const matchToken = ownRow?.match_token ?? null;

  if (matchToken) {
    const { error } = await supabase
      .from("app_battle_queue")
      .update({
        surrendered: true,
        surrendered_by_profile_key: profileKey,
        heartbeat_at: new Date().toISOString(),
      })
      .eq("match_token", matchToken);

    if (!error) return matchToken;

    if (isMissingBattleQueueTableError(error.message)) {
      isBattleQueueTableMissing = true;
      return null;
    }

    console.warn("Unable to mark battle surrender for match", error.message);
    return null;
  }

  const { error } = await supabase
    .from("app_battle_queue")
    .update({ surrendered: true, surrendered_by_profile_key: profileKey, heartbeat_at: new Date().toISOString() })
    .eq("profile_key", profileKey);

  if (!error) return null;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return null;
  }

  console.warn("Unable to mark battle surrender in queue", error.message);
  return null;
};

export const markBattleQueueMatchReadyInSupabase = async (matchToken: string) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing || !matchToken) return;

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase
    .from("app_battle_queue")
    .update({
      match_ready_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    })
    .eq("profile_key", profileKey)
    .eq("match_token", matchToken);

  if (!error) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to mark battle queue match ready", error.message);
};

export const clearBattleQueueMatchReadyInSupabase = async (matchToken: string) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing || !matchToken) return;

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase
    .from("app_battle_queue")
    .update({
      match_ready_at: null,
      heartbeat_at: new Date().toISOString(),
    })
    .eq("profile_key", profileKey)
    .eq("match_token", matchToken);

  if (!error) return;

  if (isMissingBattleReadyColumnError(error.message)) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to clear battle queue match ready", error.message);
};

export const removeBattleQueueMatchByTokenInSupabase = async (matchToken: string) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing || !matchToken) return;

  const { error } = await supabase
    .from("app_battle_queue")
    .delete()
    .eq("match_token", matchToken);

  if (!error) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to remove battle queue rows by match token", error.message);
};

export const markBattleQueueFinishedInSupabase = async (finalScore: number) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return;

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase
    .from("app_battle_queue")
    .update({
      final_score: Math.max(0, Math.round(finalScore)),
      live_score: Math.max(0, Math.round(finalScore)),
      finished_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    })
    .eq("profile_key", profileKey);

  if (!error) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to mark battle queue row as finished", error.message);
};

export const loadBattleMatchScoreStateFromSupabase = async (matchToken: string): Promise<BattleMatchScoreState | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing || !matchToken) return null;

  const profileKey = await getActiveProfileKey();
  const { data, error } = await supabase
    .from("app_battle_queue")
    .select("profile_key, live_score, live_accuracy, live_streak, final_score, finished_at, surrendered, surrendered_by_profile_key, match_ready_at")
    .eq("match_token", matchToken)
    .returns<AppBattleMatchScoreRow[]>();

  if (error) {
    if (isMissingBattleReadyColumnError(error.message)) {
      const fallback = await supabase
        .from("app_battle_queue")
        .select("profile_key, live_score, live_accuracy, live_streak, final_score, finished_at, surrendered, surrendered_by_profile_key")
        .eq("match_token", matchToken)
        .returns<AppBattleMatchScoreRow[]>();

      if (fallback.error) {
        if (isMissingBattleQueueTableError(fallback.error.message)) {
          isBattleQueueTableMissing = true;
          return null;
        }
        console.warn("Unable to load battle match score state", fallback.error.message);
        return null;
      }

      if (!fallback.data || !fallback.data.length) return null;

      const selfRow = fallback.data.find((row) => row.profile_key === profileKey) ?? null;
      const opponentRow = fallback.data.find((row) => row.profile_key !== profileKey) ?? null;

      return {
        selfProfileKey: profileKey,
        opponentPresent: Boolean(opponentRow),
        selfLiveScore: Math.max(0, selfRow?.live_score ?? 0),
        opponentLiveScore: Math.max(0, opponentRow?.live_score ?? 0),
        selfLiveAccuracy: Math.max(0, selfRow?.live_accuracy ?? 0),
        opponentLiveAccuracy: Math.max(0, opponentRow?.live_accuracy ?? 0),
        selfLiveStreak: Math.max(0, selfRow?.live_streak ?? 0),
        opponentLiveStreak: Math.max(0, opponentRow?.live_streak ?? 0),
        selfFinished: Boolean(selfRow?.finished_at),
        selfScore: selfRow?.final_score ?? null,
        opponentFinished: Boolean(opponentRow?.finished_at),
        opponentScore: opponentRow?.final_score ?? null,
        surrendered: fallback.data.some((row) => row.surrendered),
        surrenderedByProfileKey: fallback.data.find((row) => row.surrendered_by_profile_key)?.surrendered_by_profile_key ?? null,
        selfReady: true,
        opponentReady: true,
      };
    }

    if (isMissingBattleQueueTableError(error.message)) {
      isBattleQueueTableMissing = true;
      return null;
    }
    console.warn("Unable to load battle match score state", error.message);
    return null;
  }

  if (!data || !data.length) return null;

  const selfRow = data.find((row) => row.profile_key === profileKey) ?? null;
  const opponentRow = data.find((row) => row.profile_key !== profileKey) ?? null;

  return {
    selfProfileKey: profileKey,
    opponentPresent: Boolean(opponentRow),
    selfLiveScore: Math.max(0, selfRow?.live_score ?? 0),
    opponentLiveScore: Math.max(0, opponentRow?.live_score ?? 0),
    selfLiveAccuracy: Math.max(0, selfRow?.live_accuracy ?? 0),
    opponentLiveAccuracy: Math.max(0, opponentRow?.live_accuracy ?? 0),
    selfLiveStreak: Math.max(0, selfRow?.live_streak ?? 0),
    opponentLiveStreak: Math.max(0, opponentRow?.live_streak ?? 0),
    selfFinished: Boolean(selfRow?.finished_at),
    selfScore: selfRow?.final_score ?? null,
    opponentFinished: Boolean(opponentRow?.finished_at),
    opponentScore: opponentRow?.final_score ?? null,
    surrendered: data.some((row) => row.surrendered),
    surrenderedByProfileKey: data.find((row) => row.surrendered_by_profile_key)?.surrendered_by_profile_key ?? null,
    selfReady: Boolean(selfRow?.match_ready_at),
    opponentReady: Boolean(opponentRow?.match_ready_at),
  };
};

export const markBattleQueueLiveScoreInSupabase = async (liveScore: number) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return;

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase
    .from("app_battle_queue")
    .update({
      live_score: Math.max(0, Math.round(liveScore)),
      heartbeat_at: new Date().toISOString(),
    })
    .eq("profile_key", profileKey);

  if (!error) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to sync live battle score", error.message);
};

export const markBattleQueueLiveAccuracyAndStreakInSupabase = async (liveAccuracy: number, liveStreak: number) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || isBattleQueueTableMissing) return;

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase
    .from("app_battle_queue")
    .update({
      live_accuracy: Math.max(0, Math.round(liveAccuracy)),
      live_streak: Math.max(0, Math.round(liveStreak)),
      heartbeat_at: new Date().toISOString(),
    })
    .eq("profile_key", profileKey);

  if (!error) return;

  if (isMissingBattleQueueTableError(error.message)) {
    isBattleQueueTableMissing = true;
    return;
  }

  console.warn("Unable to sync live accuracy and streak", error.message);
};

export const storeBattleQuestionsInSupabase = async (args: {
  matchToken: string;
  questions: PreparedBattleQuestion[];
  category: string;
  mode: string;
}) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase.from("app_battle_questions").upsert({
    match_token: args.matchToken,
    questions: args.questions,
    category: args.category,
    mode: args.mode,
    question_count: args.questions.length,
    created_at: new Date().toISOString(),
  }, { onConflict: "match_token" });

  if (!error) return;

  console.warn("Unable to store battle questions", error.message);
};

export const loadBattleQuestionsFromSupabase = async (
  matchToken: string
): Promise<BattleQuestionsRecord | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !matchToken) return null;

  const { data, error } = await supabase
    .from("app_battle_questions")
    .select("questions, category, mode, question_count")
    .eq("match_token", matchToken)
    .maybeSingle<BattleQuestionsRecord>();

  if (error) {
    console.warn("Unable to load battle questions", error.message);
    return null;
  }

  return data ?? null;
};

export const persistBattleSessionToSupabase = async (payload: BattleSessionPayload) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    persistBattleSessionLocally(payload);
    return;
  }

  if (isBattleSessionsTableMissing) {
    persistBattleSessionLocally(payload);
    return;
  }

  const profileKey = await getActiveProfileKey();

  // This keeps battle sessions attached to the local profile key used by profile persistence.
  const { error } = await supabase.from("app_battle_sessions").insert({
    profile_key: profileKey,
    mode: payload.mode,
    category: payload.category,
    result: payload.result,
    user_score: payload.userScore,
    opponent_score: payload.opponentScore,
    opponent_name: payload.opponentName,
    played_at: new Date().toISOString(),
  });

  // Keep gameplay functional even if the table is not created yet.
  if (error) {
    const missingTable = /app_battle_sessions/i.test(error.message) && /schema cache|could not find the table/i.test(error.message);
    if (missingTable) {
      isBattleSessionsTableMissing = true;
      persistBattleSessionLocally(payload);
      console.warn("Battle sessions table is missing in Supabase. Run the migration to enable remote battle persistence.");
      return;
    }

    console.warn("Unable to persist battle session to Supabase", error.message);
    persistBattleSessionLocally(payload);
  }
};

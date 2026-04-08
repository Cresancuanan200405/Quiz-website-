"use client";

import type { ProfilePhotoValue } from "@/lib/profilePhotoStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const PROFILE_KEY = "local-player";

interface AppUserProfileBattleRow {
  profile_key: string;
  display_name: string;
  tier: string;
  avatar_type: ProfilePhotoValue["type"];
  avatar_value: string;
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

export const loadBattleOpponentsFromSupabase = async (): Promise<BattleOpponentCandidate[]> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("app_user_profiles")
    .select("profile_key, display_name, tier, avatar_type, avatar_value")
    .neq("profile_key", PROFILE_KEY)
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

export const persistBattleSessionToSupabase = async (payload: BattleSessionPayload) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  // This keeps battle sessions attached to the local profile key used by profile persistence.
  const { error } = await supabase.from("app_battle_sessions").insert({
    profile_key: PROFILE_KEY,
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
    console.warn("Unable to persist battle session to Supabase", error.message);
  }
};

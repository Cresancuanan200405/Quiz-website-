"use client";

import type { ProfilePhotoValue } from "@/lib/profilePhotoStore";
import type { ProfileSnapshot } from "@/lib/profileStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const PROFILE_KEY = "local-player";

interface AppUserProfileRow {
  profile_key: string;
  display_name: string;
  handle: string;
  tier: string;
  tags: string[];
  avatar_type: ProfilePhotoValue["type"];
  avatar_value: string;
  public_profile: boolean;
  show_online_status: boolean;
  sound_effects: boolean;
  music: boolean;
  auto_start_next_quiz: boolean;
  daily_reminder: boolean;
  challenge_alerts: boolean;
  email_notifications: boolean;
  default_language: string;
  preferred_difficulty: string;
  updated_at: string;
}

export interface PersistedProfilePayload {
  profile: ProfileSnapshot;
  photo: ProfilePhotoValue;
}

export interface PersistedSettingsPayload {
  publicProfile: boolean;
  showOnlineStatus: boolean;
  soundEffects: boolean;
  music: boolean;
  autoStartNextQuiz: boolean;
  nextQuestionDelaySeconds: number;
  dailyReminder: boolean;
  challengeAlerts: boolean;
  emailNotifications: boolean;
  defaultLanguage: string;
  preferredDifficulty: string;
}

export type ProfilePersistencePayload = PersistedProfilePayload & Partial<PersistedSettingsPayload>;

export const loadProfileFromSupabase = async (): Promise<ProfilePersistencePayload | null> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("app_user_profiles")
    .select("profile_key, display_name, handle, tier, tags, avatar_type, avatar_value, updated_at")
    .eq("profile_key", PROFILE_KEY)
    .maybeSingle<AppUserProfileRow>();

  if (error || !data) return null;

  return {
    profile: {
      displayName: data.display_name,
      handle: data.handle,
      tier: data.tier,
      tags: Array.isArray(data.tags) ? data.tags : [],
    },
    photo: {
      type: data.avatar_type,
      value: data.avatar_value,
    },
    publicProfile: data.public_profile,
    showOnlineStatus: data.show_online_status,
    soundEffects: data.sound_effects,
    music: data.music,
    autoStartNextQuiz: data.auto_start_next_quiz,
    dailyReminder: data.daily_reminder,
    challengeAlerts: data.challenge_alerts,
    emailNotifications: data.email_notifications,
    defaultLanguage: data.default_language,
    preferredDifficulty: data.preferred_difficulty,
  };
};

export const persistProfileToSupabase = async (payload: ProfilePersistencePayload) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { profile, photo } = payload;

  await supabase.from("app_user_profiles").upsert(
    {
      profile_key: PROFILE_KEY,
      display_name: profile.displayName,
      handle: profile.handle,
      tier: profile.tier,
      tags: profile.tags,
      avatar_type: photo.type,
      avatar_value: photo.value,
      public_profile: payload.publicProfile ?? true,
      show_online_status: payload.showOnlineStatus ?? true,
      sound_effects: payload.soundEffects ?? true,
      music: payload.music ?? false,
      auto_start_next_quiz: payload.autoStartNextQuiz ?? true,
      daily_reminder: payload.dailyReminder ?? true,
      challenge_alerts: payload.challengeAlerts ?? true,
      email_notifications: payload.emailNotifications ?? false,
      default_language: payload.defaultLanguage ?? "English",
      preferred_difficulty: payload.preferredDifficulty ?? "Medium",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_key" }
  );
};

export const persistSettingsToSupabase = async (payload: PersistedSettingsPayload) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  await supabase
    .from("app_user_profiles")
    .update({
      public_profile: payload.publicProfile,
      show_online_status: payload.showOnlineStatus,
      sound_effects: payload.soundEffects,
      music: payload.music,
      auto_start_next_quiz: payload.autoStartNextQuiz,
      daily_reminder: payload.dailyReminder,
      challenge_alerts: payload.challengeAlerts,
      email_notifications: payload.emailNotifications,
      default_language: payload.defaultLanguage,
      preferred_difficulty: payload.preferredDifficulty,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_key", PROFILE_KEY);
};

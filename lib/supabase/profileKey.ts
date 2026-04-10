"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const PROFILE_KEY_STORAGE = "quiz-profile-key-v1";

const generateProfileKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `player-${crypto.randomUUID()}`;
  }
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getLocalProfileKey = () => {
  if (typeof window === "undefined") return "local-player";

  try {
    const existing = window.localStorage.getItem(PROFILE_KEY_STORAGE);
    if (existing) return existing;

    const generated = generateProfileKey();
    window.localStorage.setItem(PROFILE_KEY_STORAGE, generated);
    return generated;
  } catch {
    return "local-player";
  }
};

export const getActiveProfileKey = async () => {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      return user.id;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const rawAuth = window.localStorage.getItem("quizarena-auth");
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth) as { state?: { user?: { id?: string } } };
        const persistedUserId = parsed?.state?.user?.id?.trim();
        if (persistedUserId) {
          return persistedUserId;
        }
      }
    } catch {
      // Ignore malformed persisted auth state.
    }
  }

  return getLocalProfileKey();
};

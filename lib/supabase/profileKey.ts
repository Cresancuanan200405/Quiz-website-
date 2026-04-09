"use client";

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

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistSettingsToSupabase } from "@/lib/supabase/profilePersistence";

export type SettingsLanguage = "English" | "Spanish" | "French" | "Japanese";
export type SettingsDifficulty = "Easy" | "Medium" | "Hard";

interface SettingsState {
  publicProfile: boolean;
  showOnlineStatus: boolean;
  soundEffects: boolean;
  music: boolean;
  autoStartNextQuiz: boolean;
  nextQuestionDelaySeconds: number;
  showDifficultyProgressionDialog: boolean;
  dailyReminder: boolean;
  challengeAlerts: boolean;
  emailNotifications: boolean;
  defaultLanguage: SettingsLanguage;
  preferredDifficulty: SettingsDifficulty;
  setToggle: (key: keyof Pick<SettingsState, "publicProfile" | "showOnlineStatus" | "soundEffects" | "music" | "autoStartNextQuiz" | "dailyReminder" | "challengeAlerts" | "emailNotifications">, value: boolean) => void;
  setDefaultLanguage: (value: SettingsLanguage) => void;
  setPreferredDifficulty: (value: SettingsDifficulty) => void;
  setNextQuestionDelaySeconds: (value: number) => void;
  setShowDifficultyProgressionDialog: (value: boolean) => void;
  setAllSettings: (settings: Partial<Pick<SettingsState, "publicProfile" | "showOnlineStatus" | "soundEffects" | "music" | "autoStartNextQuiz" | "dailyReminder" | "challengeAlerts" | "emailNotifications" | "defaultLanguage" | "preferredDifficulty" | "nextQuestionDelaySeconds" | "showDifficultyProgressionDialog">>) => void;
}

const syncSettingsToSupabase = async (state: SettingsState) => {
  await persistSettingsToSupabase({
    publicProfile: state.publicProfile,
    showOnlineStatus: state.showOnlineStatus,
    soundEffects: state.soundEffects,
    music: state.music,
    autoStartNextQuiz: state.autoStartNextQuiz,
    nextQuestionDelaySeconds: state.nextQuestionDelaySeconds,
    dailyReminder: state.dailyReminder,
    challengeAlerts: state.challengeAlerts,
    emailNotifications: state.emailNotifications,
    defaultLanguage: state.defaultLanguage,
    preferredDifficulty: state.preferredDifficulty,
  });
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      publicProfile: true,
      showOnlineStatus: true,
      soundEffects: true,
      music: false,
      autoStartNextQuiz: true,
      nextQuestionDelaySeconds: 3,
      showDifficultyProgressionDialog: true,
      dailyReminder: true,
      challengeAlerts: true,
      emailNotifications: false,
      defaultLanguage: "English",
      preferredDifficulty: "Medium",
      setAllSettings: (settings) =>
        set((state) => {
          const sanitized = Object.fromEntries(
            Object.entries(settings).filter(([, value]) => value !== undefined)
          );

          return {
            ...state,
            ...sanitized,
          };
        }),
      setToggle: (key, value) =>
        set((state) => {
          const next = { ...state, [key]: value } as SettingsState;
          void syncSettingsToSupabase(next);
          return { [key]: value } as Partial<SettingsState>;
        }),
      setDefaultLanguage: (value) =>
        set((state) => {
          const next = { ...state, defaultLanguage: value } as SettingsState;
          void syncSettingsToSupabase(next);
          return { defaultLanguage: value };
        }),
      setPreferredDifficulty: (value) =>
        set((state) => {
          const next = { ...state, preferredDifficulty: value } as SettingsState;
          void syncSettingsToSupabase(next);
          return { preferredDifficulty: value };
        }),
      setNextQuestionDelaySeconds: (value) =>
        set((state) => ({
          ...state,
          nextQuestionDelaySeconds: Math.max(1, Math.min(10, Math.round(value))),
        })),
      setShowDifficultyProgressionDialog: (value) =>
        set(() => ({
          showDifficultyProgressionDialog: value,
        })),
    }),
    {
      name: "quizarena-settings",
    }
  )
);

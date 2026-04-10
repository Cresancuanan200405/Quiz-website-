"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { useProfileStore } from "@/lib/profileStore";
import { useSettingsStore } from "@/lib/settingsStore";
import { scoreBattlePoints } from "@/lib/battlePoints";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LOCAL_BATTLE_SESSIONS_KEY } from "@/lib/supabase/battlePersistence";
import { loadProfileFromSupabase } from "@/lib/supabase/profilePersistence";
import { useTriviaFactsStore } from "@/lib/triviaFactsStore";
import type { CurrentUser } from "@/lib/types";

interface AuthState {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocial: (provider: "google" | "discord" | "github") => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const setAuthCookie = (value: "1" | "0") => {
  if (typeof document === "undefined") return;
  if (value === "1") {
    document.cookie = "qa_auth=1; path=/; max-age=2592000; samesite=lax";
  } else {
    document.cookie = "qa_auth=0; path=/; max-age=0; samesite=lax";
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const SIGNUP_COOLDOWN_MS = 65_000;
const SIGNUP_COOLDOWN_KEY = "quizarena-signup-cooldown";
const LAST_AUTH_USER_KEY = "quizarena-last-auth-user-id";

const getLastAuthUserId = () => {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(LAST_AUTH_USER_KEY);
  return raw?.trim() || undefined;
};

const setLastAuthUserId = (userId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_AUTH_USER_KEY, userId);
};

const clearLastAuthUserId = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_AUTH_USER_KEY);
};

const getSignupCooldownMap = (): Record<string, number> => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(SIGNUP_COOLDOWN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const setSignupCooldownTimestamp = (email: string) => {
  if (typeof window === "undefined") return;
  const key = email.toLowerCase().trim();
  const map = getSignupCooldownMap();
  map[key] = Date.now();
  window.localStorage.setItem(SIGNUP_COOLDOWN_KEY, JSON.stringify(map));
};

const getSignupCooldownSecondsRemaining = (email: string) => {
  const key = email.toLowerCase().trim();
  const map = getSignupCooldownMap();
  const ts = map[key];
  if (!ts) return 0;

  const elapsed = Date.now() - ts;
  const remainingMs = SIGNUP_COOLDOWN_MS - elapsed;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

const clearPersistedSessionData = () => {
  if (typeof window === "undefined") return;

  const keysToRemove = [
    "quizarena-player-stats",
    "battle-stats-store",
    "quizarena-trivia-facts",
    "profile-store",
    "profile-photo-store",
    "quizarena-settings",
    "local-quiz-sessions",
    LOCAL_BATTLE_SESSIONS_KEY,
    "quiz-profile-key-v1",
  ];

  keysToRemove.forEach((key) => {
    window.localStorage.removeItem(key);
  });

  usePlayerStatsStore.setState({
    quizzesCompleted: 0,
    totalCorrectAnswers: 0,
    totalAnsweredQuestions: 0,
    bestStreak: 0,
    totalPoints: 0,
    quizHistory: [],
  });

  useBattleStatsStore.setState({
    battlesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalBattlePoints: 0,
    totalScoreFor: 0,
    totalScoreAgainst: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    battleHistory: [],
  });

  useTriviaFactsStore.setState({
    likedFactIds: [],
    savedFactIds: [],
    factSnapshots: {},
    factActivity: [],
  });

  useSettingsStore.setState({
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
  });

  useProfileStore.getState().resetProfile();
  useProfilePhotoStore.getState().resetPhoto();
};

const shouldResetDataForUser = (nextUserId: string, currentUserId?: string) => {
  if (currentUserId && currentUserId !== nextUserId) return true;
  const lastAuthUserId = getLastAuthUserId();
  if (!lastAuthUserId) return false;
  return lastAuthUserId !== nextUserId;
};

const registerUserViaRpc = async (email: string, password: string, username: string) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(`${url}/rest/v1/rpc/app_register_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      p_email: email,
      p_password: password,
      p_username: username,
    }),
  });

  if (response.ok) {
    return;
  }

  let message = "Unable to create account.";
  try {
    const payload = (await response.json()) as { message?: string; error?: string; hint?: string };
    message = payload.message || payload.error || message;
  } catch {
    // Keep generic fallback message.
  }

  throw new Error(message);
};

const toSafeHandle = (username: string) => {
  const clean = username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `@${clean || "player"}`;
};

const toInitials = (value: string) => {
  const compact = value.trim().replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase() || "PL";
};

const hydrateCurrentUser = (id: string, username: string, handle: string, email?: string): CurrentUser => ({
  id,
  email,
  username,
  avatar: toInitials(username),
  score: 0,
  accuracy: 0,
  quizCount: 0,
  rank: 1,
  tier: "Rising",
  handle: handle.startsWith("@") ? handle : `@${handle}`,
  joinDate: `Joined ${new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}`,
  streak: 0,
  points: 0,
  weeklyGoal: 0,
  badges: [],
  savedFactIds: [],
  quizHistory: [],
});

const syncLiveIdentityToStores = (username: string, handle: string, setPhoto: boolean) => {
  useProfileStore.getState().setProfile({
    displayName: username,
    handle,
  });

  if (setPhoto) {
    useProfilePhotoStore.getState().setPhoto({
      type: "initials",
      value: toInitials(username),
    });
  }
};

const ensureProfilesRow = async (
  userId: string,
  username: string,
  handle: string
): Promise<{ username: string; handle: string }> => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("username, handle")
    .eq("id", userId)
    .maybeSingle<{ username: string; handle: string }>();

  if (existing) {
    return {
      username: existing.username || username,
      handle: existing.handle || handle,
    };
  }

  const payload = {
    id: userId,
    username,
    handle,
    tier: "Rising",
  };

  const { error } = await supabase.from("profiles").insert(payload);
  if (error) {
    throw new Error(error.message || "Unable to create your profile.");
  }

  return { username, handle };
};

const ensureAppUserProfileRow = async (profileKey: string, username: string, handle: string) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("app_user_profiles")
    .select("profile_key")
    .eq("profile_key", profileKey)
    .maybeSingle<{ profile_key: string }>();

  if (existing?.profile_key) {
    await supabase
      .from("app_user_profiles")
      .update({
        display_name: username,
        handle,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_key", profileKey);
    return;
  }

  await supabase.from("app_user_profiles").insert({
    profile_key: profileKey,
    display_name: username,
    handle,
    bio: "Curious challenger exploring trivia and strategy one round at a time.",
    tier: "Rising",
    tags: [],
    avatar_type: "initials",
    avatar_value: username.slice(0, 2).toUpperCase() || "PL",
    public_profile: true,
    show_online_status: true,
    sound_effects: true,
    music: false,
    auto_start_next_quiz: true,
    next_question_delay_seconds: 3,
    daily_reminder: true,
    challenge_alerts: true,
    email_notifications: false,
    default_language: "English",
    preferred_difficulty: "Medium",
    updated_at: new Date().toISOString(),
  });
};

interface QuizSessionHydrationRow {
  id: number;
  category: string;
  difficulty: string;
  question_count: number;
  correct: number;
  total: number;
  passed: boolean;
  best_streak: number;
  points: number;
  completed_at: string;
}

interface BattleSessionHydrationRow {
  id: number;
  mode: string;
  category: string;
  result: "win" | "loss" | "draw";
  user_score: number;
  opponent_score: number;
  opponent_name: string;
  played_at: string;
}

const hydrateStoresFromSupabase = async (profileKey: string, fallbackUsername: string, fallbackHandle: string) => {
  const persisted = await loadProfileFromSupabase();
  if (persisted) {
    useProfileStore.getState().setProfile(persisted.profile);
    useProfilePhotoStore.getState().setPhoto(persisted.photo);
    useSettingsStore.getState().setAllSettings({
      publicProfile: persisted.publicProfile,
      showOnlineStatus: persisted.showOnlineStatus,
      soundEffects: persisted.soundEffects,
      music: persisted.music,
      autoStartNextQuiz: persisted.autoStartNextQuiz,
      nextQuestionDelaySeconds: persisted.nextQuestionDelaySeconds,
      dailyReminder: persisted.dailyReminder,
      challengeAlerts: persisted.challengeAlerts,
      emailNotifications: persisted.emailNotifications,
      defaultLanguage: persisted.defaultLanguage as "English" | "Spanish" | "French" | "Japanese" | undefined,
      preferredDifficulty: persisted.preferredDifficulty as "Easy" | "Medium" | "Hard" | undefined,
    });
  } else {
    syncLiveIdentityToStores(fallbackUsername, fallbackHandle, false);
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const [quizResponse, battleResponse] = await Promise.all([
    supabase
      .from("app_quiz_sessions")
      .select("id, category, difficulty, question_count, correct, total, passed, best_streak, points, completed_at")
      .eq("profile_key", profileKey)
      .order("completed_at", { ascending: false })
      .returns<QuizSessionHydrationRow[]>(),
    supabase
      .from("app_battle_sessions")
      .select("id, mode, category, result, user_score, opponent_score, opponent_name, played_at")
      .eq("profile_key", profileKey)
      .order("played_at", { ascending: false })
      .returns<BattleSessionHydrationRow[]>(),
  ]);

  if (!quizResponse.error && quizResponse.data) {
    const localQuizHistory = usePlayerStatsStore.getState().quizHistory;
    const remoteQuizHistory = quizResponse.data.map((row) => ({
      id: `remote-${row.id}`,
      category: row.category,
      difficulty: row.difficulty,
      questionCount: Math.max(0, row.question_count),
      correct: Math.max(0, row.correct),
      total: Math.max(0, row.total),
      passed: row.passed,
      points: Math.max(0, row.points),
      completedAt: row.completed_at,
    }));

    const dedupedQuiz = new Map<string, (typeof remoteQuizHistory)[number]>();
    [...localQuizHistory, ...remoteQuizHistory].forEach((item) => {
      const key = `${item.category}|${item.difficulty}|${item.correct}|${item.total}|${item.points}|${item.completedAt}`;
      if (!dedupedQuiz.has(key)) {
        dedupedQuiz.set(key, item);
      }
    });

    const mergedQuizHistory = Array.from(dedupedQuiz.values())
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 50);

    usePlayerStatsStore.setState({
      quizzesCompleted: mergedQuizHistory.length,
      totalCorrectAnswers: mergedQuizHistory.reduce((sum, item) => sum + item.correct, 0),
      totalAnsweredQuestions: mergedQuizHistory.reduce((sum, item) => sum + item.total, 0),
      bestStreak: Math.max(0, ...mergedQuizHistory.map((item) => Math.min(item.correct, item.questionCount))),
      totalPoints: mergedQuizHistory.reduce((sum, item) => sum + item.points, 0),
      quizHistory: mergedQuizHistory,
    });
  }

  if (!battleResponse.error && battleResponse.data) {
    const localBattleHistory = useBattleStatsStore.getState().battleHistory;
    const remoteBattleHistory = battleResponse.data.map((row) => ({
      id: `remote-${row.id}`,
      mode: row.mode,
      category: row.category,
      result: row.result,
      userScore: Math.max(0, row.user_score),
      opponentScore: Math.max(0, row.opponent_score),
      opponentName: row.opponent_name,
      pointsEarned: scoreBattlePoints({ result: row.result, userScore: row.user_score, opponentScore: row.opponent_score }),
      playedAt: row.played_at,
    }));

    const dedupedBattle = new Map<string, (typeof remoteBattleHistory)[number]>();
    [...localBattleHistory, ...remoteBattleHistory].forEach((item) => {
      const key = `${item.mode}|${item.category}|${item.result}|${item.userScore}|${item.opponentScore}|${item.opponentName}|${item.playedAt}`;
      if (!dedupedBattle.has(key)) {
        dedupedBattle.set(key, item);
      }
    });

    const mergedBattleHistory = Array.from(dedupedBattle.values())
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, 120);

    let run = 0;
    let bestRun = 0;
    [...mergedBattleHistory].reverse().forEach((item) => {
      if (item.result === "win") {
        run += 1;
        bestRun = Math.max(bestRun, run);
      } else {
        run = 0;
      }
    });

    const currentWinStreak = (() => {
      let streak = 0;
      for (const item of mergedBattleHistory) {
        if (item.result !== "win") break;
        streak += 1;
      }
      return streak;
    })();

    useBattleStatsStore.setState({
      battlesPlayed: mergedBattleHistory.length,
      wins: mergedBattleHistory.filter((item) => item.result === "win").length,
      losses: mergedBattleHistory.filter((item) => item.result === "loss").length,
      draws: mergedBattleHistory.filter((item) => item.result === "draw").length,
      totalBattlePoints: mergedBattleHistory.reduce((sum, item) => sum + item.pointsEarned, 0),
      totalScoreFor: mergedBattleHistory.reduce((sum, item) => sum + item.userScore, 0),
      totalScoreAgainst: mergedBattleHistory.reduce((sum, item) => sum + item.opponentScore, 0),
      currentWinStreak,
      bestWinStreak: bestRun,
      battleHistory: mergedBattleHistory,
    });
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: async (email, password) => {
        await delay(600);

        if (!email.includes("@") || password.length < 8) {
          throw new Error("Enter a valid email and password.");
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error || !data.user) {
          throw new Error(error?.message || "No account matched those credentials.");
        }

        const resolvedHandle = toSafeHandle(data.user.user_metadata?.username || data.user.email?.split("@")[0] || "player");
        const profile = await ensureProfilesRow(
          data.user.id,
          data.user.user_metadata?.username || data.user.email?.split("@")[0] || "Player",
          resolvedHandle
        );

        if (shouldResetDataForUser(data.user.id, get().user?.id)) {
          clearPersistedSessionData();
        }

        await ensureAppUserProfileRow(data.user.id, profile.username, profile.handle);
        await hydrateStoresFromSupabase(data.user.id, profile.username, profile.handle);
        setLastAuthUserId(data.user.id);

        setAuthCookie("1");
        set({
          user: hydrateCurrentUser(data.user.id, profile.username, profile.handle, data.user.email ?? undefined),
          isAuthenticated: true,
        });
      },
      loginWithSocial: async () => {
        throw new Error("Social login is not configured yet. Use email and password.");
      },
      register: async (username, email, password) => {
        await delay(600);

        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedUsername || !normalizedEmail.includes("@") || password.length < 8) {
          throw new Error("Please provide valid registration details.");
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        }

        const handle = toSafeHandle(normalizedUsername);
        const cooldownSeconds = getSignupCooldownSecondsRemaining(normalizedEmail);
        if (cooldownSeconds > 0) {
          throw new Error(`Please wait ${cooldownSeconds}s before trying Sign Up again for this email.`);
        }

        setSignupCooldownTimestamp(normalizedEmail);

        try {
          await registerUserViaRpc(normalizedEmail, password, normalizedUsername);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to create account.";
          if (/no api key found/i.test(message)) {
            throw new Error("Supabase API key is missing in browser requests. Restart your dev server and verify NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.");
          }
          throw new Error(message);
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError || !signInData.user) {
          throw new Error(signInError?.message || "Account created, but auto sign-in failed. Please sign in manually.");
        }

        const activeUser = signInData.user;

        const profile = await ensureProfilesRow(activeUser.id, normalizedUsername, handle);
        clearPersistedSessionData();
        await ensureAppUserProfileRow(activeUser.id, profile.username, profile.handle);
        await hydrateStoresFromSupabase(activeUser.id, profile.username, profile.handle);
        setLastAuthUserId(activeUser.id);

        setAuthCookie("1");
        set({
          user: hydrateCurrentUser(activeUser.id, profile.username, profile.handle, activeUser.email ?? undefined),
          isAuthenticated: true,
        });
      },
      logout: async () => {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          await supabase.auth.signOut();
        }

        setAuthCookie("0");
        set({ user: null, isAuthenticated: false });
        if (typeof window !== "undefined") {
          localStorage.removeItem("quizarena-auth");
        }
      },
      changePassword: async (newPassword: string) => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        }

        const normalizedPassword = newPassword.trim();
        if (normalizedPassword.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You need an active session to change password.");
        }

        const { error } = await supabase.auth.updateUser({
          password: normalizedPassword,
        });

        if (error) {
          throw new Error(error.message || "Unable to change password right now.");
        }
      },
      deleteAccount: async () => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        }

        const { error } = await supabase.rpc("app_delete_my_account");
        if (error) {
          const lowerMessage = (error.message || "").toLowerCase();
          const isMissingRpc =
            error.code === "PGRST202" ||
            lowerMessage.includes("schema cache") ||
            lowerMessage.includes("could not find the function public.app_delete_my_account");

          if (isMissingRpc) {
            throw new Error("Delete account is not deployed yet. Apply migration 20260410_013 (or latest), then refresh the API schema cache and try again.");
          }

          throw new Error(error.message || "Unable to delete account right now.");
        }

        await supabase.auth.signOut().catch(() => undefined);
        clearPersistedSessionData();

        setAuthCookie("0");
        set({ user: null, isAuthenticated: false });

        if (typeof window !== "undefined") {
          localStorage.removeItem("quizarena-auth");
          localStorage.removeItem(SIGNUP_COOLDOWN_KEY);
        }
        clearLastAuthUserId();
      },
    }),
    {
      name: "quizarena-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

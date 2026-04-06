"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentUser } from "@/lib/mockData";
import type { CurrentUser } from "@/lib/types";

interface AuthState {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocial: (provider: "google" | "discord" | "github") => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email, password) => {
        await delay(800);

        if (!email.includes("@") || password.length < 8) {
          throw new Error("Invalid email or password.");
        }

        setAuthCookie("1");
        set({ user: currentUser, isAuthenticated: true });
      },
      loginWithSocial: (provider) => {
        setAuthCookie("1");
        set({
          user: {
            ...currentUser,
            username:
              provider === "google"
                ? "GooglePlayer"
                : provider === "discord"
                  ? "DiscordPlayer"
                  : "GitHubPlayer",
          },
          isAuthenticated: true,
        });
      },
      register: async (username, email, password) => {
        await delay(800);

        if (!username.trim() || !email.includes("@") || password.length < 8) {
          throw new Error("Please provide valid registration details.");
        }

        setAuthCookie("1");
        set({ user: { ...currentUser, username }, isAuthenticated: true });
      },
      logout: () => {
        setAuthCookie("0");
        set({ user: null, isAuthenticated: false });
        if (typeof window !== "undefined") {
          localStorage.removeItem("quizarena-auth");
        }
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

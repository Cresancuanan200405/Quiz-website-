"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getActiveProfileKey } from "@/lib/supabase/profileKey";

const LOCAL_QUIZ_SESSIONS_KEY = "local-quiz-sessions";
let isQuizSessionsTableMissing = false;

export interface QuizSessionPayload {
  category: string;
  difficulty: string;
  questionCount: number;
  correct: number;
  total: number;
  passed: boolean;
  bestStreak: number;
  points: number;
  completedAt?: string;
}

const persistQuizSessionLocally = (payload: QuizSessionPayload) => {
  if (typeof window === "undefined") return;

  const existingRaw = window.localStorage.getItem(LOCAL_QUIZ_SESSIONS_KEY);
  const existing = existingRaw ? (JSON.parse(existingRaw) as Array<QuizSessionPayload & { completedAt: string }>) : [];
  existing.push({ ...payload, completedAt: payload.completedAt ?? new Date().toISOString() });

  window.localStorage.setItem(LOCAL_QUIZ_SESSIONS_KEY, JSON.stringify(existing.slice(-200)));
};

export const persistQuizSessionToSupabase = async (payload: QuizSessionPayload) => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    persistQuizSessionLocally(payload);
    return;
  }

  if (isQuizSessionsTableMissing) {
    persistQuizSessionLocally(payload);
    return;
  }

  const profileKey = await getActiveProfileKey();
  const { error } = await supabase.from("app_quiz_sessions").insert({
    profile_key: profileKey,
    category: payload.category,
    difficulty: payload.difficulty,
    question_count: payload.questionCount,
    correct: payload.correct,
    total: payload.total,
    passed: payload.passed,
    best_streak: payload.bestStreak,
    points: payload.points,
    completed_at: payload.completedAt ?? new Date().toISOString(),
  });

  if (error) {
    const missingTable = /app_quiz_sessions/i.test(error.message) && /schema cache|could not find the table/i.test(error.message);
    if (missingTable) {
      isQuizSessionsTableMissing = true;
      persistQuizSessionLocally(payload);
      console.warn("Quiz sessions table is missing in Supabase. Run the migration to enable remote quiz persistence.");
      return;
    }

    console.warn("Unable to persist quiz session to Supabase", error.message);
    persistQuizSessionLocally(payload);
  }
};

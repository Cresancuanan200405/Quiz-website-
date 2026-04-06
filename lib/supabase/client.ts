"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const getEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
};

export const getSupabaseBrowserClient = () => {
  const env = getEnv();
  if (!env) return null;

  if (!browserClient) {
    browserClient = createClient(env.url, env.anonKey, {
      auth: { persistSession: false },
    });
  }

  return browserClient;
};

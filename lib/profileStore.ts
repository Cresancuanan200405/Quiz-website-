"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentUser } from "@/lib/mockData";

export const MAX_PROFILE_TAGS = 12;

export interface ProfileSnapshot {
  displayName: string;
  handle: string;
  tier: string;
  tags: string[];
}

interface ProfileState extends ProfileSnapshot {
  setProfile: (updates: Partial<ProfileSnapshot>) => void;
  resetProfile: () => void;
}

const defaultProfile: ProfileSnapshot = {
  displayName: currentUser.username,
  handle: currentUser.handle,
  tier: currentUser.tier,
  tags: currentUser.badges.slice(0, MAX_PROFILE_TAGS),
};

const sanitizeTags = (tags: string[]) => {
  const deduped = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  return deduped.slice(0, MAX_PROFILE_TAGS);
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...defaultProfile,
      setProfile: (updates) =>
        set((state) => ({
          displayName: (updates.displayName ?? state.displayName).trim(),
          handle: (updates.handle ?? state.handle).trim(),
          tier: updates.tier ?? state.tier,
          tags: updates.tags ? sanitizeTags(updates.tags) : state.tags,
        })),
      resetProfile: () => set(defaultProfile),
    }),
    {
      name: "profile-store",
    }
  )
);
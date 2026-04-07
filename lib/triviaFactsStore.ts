"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FactSnapshot {
  id: string;
  title: string;
  body: string;
  category: string;
}

export interface FactActivityItem {
  id: string;
  factId: string;
  factTitle: string;
  category: string;
  action: "liked" | "unliked" | "saved" | "unsaved";
  at: string;
}

interface TriviaFactsState {
  likedFactIds: string[];
  savedFactIds: string[];
  factSnapshots: Record<string, FactSnapshot>;
  factActivity: FactActivityItem[];
  toggleLike: (id: string, snapshot?: FactSnapshot) => void;
  toggleSave: (id: string, snapshot?: FactSnapshot) => void;
}

const toggleId = (items: string[], id: string) =>
  items.includes(id) ? items.filter((item) => item !== id) : [...items, id];

export const useTriviaFactsStore = create<TriviaFactsState>()(
  persist(
    (set) => ({
      likedFactIds: [],
      savedFactIds: [],
      factSnapshots: {},
      factActivity: [],
      toggleLike: (id, snapshot) =>
        set((state) => {
          const isLiked = state.likedFactIds.includes(id);
          const action: FactActivityItem["action"] = isLiked ? "unliked" : "liked";
          const nextSnapshots = snapshot
            ? {
                ...state.factSnapshots,
                [id]: snapshot,
              }
            : state.factSnapshots;
          const knownFact = nextSnapshots[id];

          return {
            likedFactIds: toggleId(state.likedFactIds, id),
            factSnapshots: nextSnapshots,
            factActivity: knownFact
              ? [
                  {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    factId: id,
                    factTitle: knownFact.title,
                    category: knownFact.category,
                    action,
                    at: new Date().toISOString(),
                  },
                  ...state.factActivity,
                ].slice(0, 100)
              : state.factActivity,
          };
        }),
      toggleSave: (id, snapshot) =>
        set((state) => {
          const isSaved = state.savedFactIds.includes(id);
          const action: FactActivityItem["action"] = isSaved ? "unsaved" : "saved";
          const nextSnapshots = snapshot
            ? {
                ...state.factSnapshots,
                [id]: snapshot,
              }
            : state.factSnapshots;
          const knownFact = nextSnapshots[id];

          return {
            savedFactIds: toggleId(state.savedFactIds, id),
            factSnapshots: nextSnapshots,
            factActivity: knownFact
              ? [
                  {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    factId: id,
                    factTitle: knownFact.title,
                    category: knownFact.category,
                    action,
                    at: new Date().toISOString(),
                  },
                  ...state.factActivity,
                ].slice(0, 100)
              : state.factActivity,
          };
        }),
    }),
    {
      name: "quizarena-trivia-facts",
    }
  )
);

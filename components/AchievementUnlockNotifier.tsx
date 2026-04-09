"use client";

import { useEffect, useMemo, useRef } from "react";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import { buildAchievementProgress, getUnlockedAchievements } from "@/lib/achievements";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { useNotificationStore } from "@/lib/notificationStore";

const STORAGE_KEY = "seen-unlocked-achievements-v1";

export default function AchievementUnlockNotifier() {
  const { quizzesCompleted, totalCorrectAnswers, bestStreak, totalPoints, quizHistory } = usePlayerStatsStore();
  const { battlesPlayed, wins, bestWinStreak, totalBattlePoints } = useBattleStatsStore();
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const hydratedRef = useRef(false);
  const previousUnlockedRef = useRef<Set<string> | null>(null);

  const unlocked = useMemo(() => {
    const progress = buildAchievementProgress({
      quizzesCompleted,
      totalCorrectAnswers,
      bestStreak,
      totalPoints,
      battlesPlayed,
      wins,
      bestWinStreak,
      totalBattlePoints,
      quizHistory,
    });
    return getUnlockedAchievements(progress);
  }, [battlesPlayed, bestStreak, bestWinStreak, quizHistory, quizzesCompleted, totalBattlePoints, totalCorrectAnswers, totalPoints, wins]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const seenRaw = window.localStorage.getItem(STORAGE_KEY);
      const seen = new Set<string>(seenRaw ? (JSON.parse(seenRaw) as string[]) : []);
      const unlockedIds = unlocked.map((item) => item.id);
      const unlockedSet = new Set(unlockedIds);

      if (!hydratedRef.current) {
        hydratedRef.current = true;
        previousUnlockedRef.current = unlockedSet;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set([...seen, ...unlockedIds]))));
        return;
      }

      const previousUnlocked = previousUnlockedRef.current ?? new Set<string>();
      const newlyUnlocked = unlocked.filter((item) => !previousUnlocked.has(item.id) && !seen.has(item.id));
      if (newlyUnlocked.length) {
        newlyUnlocked.forEach((item) => {
          pushNotification(`Achievement Unlocked: ${item.title} (${item.rarity})`, "success", 4200);
        });
      }

      const merged = Array.from(new Set([...seen, ...unlockedIds]));
      previousUnlockedRef.current = unlockedSet;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Ignore storage issues and continue without notifier persistence.
    }
  }, [pushNotification, unlocked]);

  return null;
}

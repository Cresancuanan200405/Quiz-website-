"use client";

export type NotificationFeedType = "achievement" | "battle" | "quiz" | "milestone";

export interface NotificationFeedItem {
  id: string;
  type: NotificationFeedType;
  title: string;
  description: string;
  timestamp: number;
  href: string;
  important: boolean;
}

interface BuildNotificationFeedInput {
  latestQuiz?: {
    id: string;
    category: string;
    difficulty: string;
    correct: number;
    total: number;
    points: number;
    completedAt: string;
  };
  latestBattle?: {
    id: string;
    category: string;
    result: "win" | "loss" | "draw";
    userScore: number;
    opponentScore: number;
    opponentName: string;
    playedAt: string;
  };
  bestStreak: number;
  totalPoints: number;
  totalBattlePoints: number;
  wins: number;
  dailyReminder: boolean;
  challengeAlerts: boolean;
  emailNotifications: boolean;
}

export const READ_NOTIFICATIONS_STORAGE_KEY = "app-read-notifications-v1";
export const DISMISSED_NOTIFICATIONS_STORAGE_KEY = "app-dismissed-notifications-v1";
export const ARCHIVED_NOTIFICATIONS_STORAGE_KEY = "app-notification-archive-v1";

export const formatRelativeNotificationTime = (timestamp: number) => {
  const deltaMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export const buildNotificationFeed = ({
  latestQuiz,
  latestBattle,
  bestStreak,
  totalPoints,
  totalBattlePoints,
  wins,
  dailyReminder,
  challengeAlerts,
  emailNotifications,
}: BuildNotificationFeedInput): NotificationFeedItem[] => {
  const feed: NotificationFeedItem[] = [];

  if (latestBattle && challengeAlerts) {
    const isWin = latestBattle.result === "win";
    feed.push({
      id: `battle-${latestBattle.id}`,
      type: "battle",
      title: isWin ? "Battle Victory" : latestBattle.result === "loss" ? "Battle Result" : "Battle Draw",
      description: `vs ${latestBattle.opponentName} • ${latestBattle.userScore}-${latestBattle.opponentScore} • ${latestBattle.category}`,
      timestamp: new Date(latestBattle.playedAt).getTime(),
      href: "/profile?tab=history&section=battle",
      important: true,
    });
  }

  if (latestQuiz && dailyReminder) {
    feed.push({
      id: `quiz-${latestQuiz.id}`,
      type: "quiz",
      title: "Trivia Session Complete",
      description: `${latestQuiz.category} ${latestQuiz.difficulty} • ${latestQuiz.correct}/${latestQuiz.total} • ${latestQuiz.points} pts`,
      timestamp: new Date(latestQuiz.completedAt).getTime(),
      href: "/profile?tab=history&section=trivia",
      important: true,
    });
  }

  if (bestStreak >= 5 && dailyReminder) {
    feed.push({
      id: `streak-${bestStreak}`,
      type: "achievement",
      title: "Streak Milestone",
      description: `Your best trivia streak is now ${bestStreak}. Keep momentum going.`,
      timestamp: Date.now() - 2 * 60 * 1000,
      href: "/profile?tab=stats",
      important: true,
    });
  }

  if ((totalPoints >= 1000 || totalBattlePoints >= 1000 || wins >= 10) && emailNotifications) {
    feed.push({
      id: `milestone-${totalPoints}-${totalBattlePoints}-${wins}`,
      type: "milestone",
      title: "Performance Milestone",
      description: `Journey ${totalPoints} pts • Battle ${totalBattlePoints} pts • ${wins} wins`,
      timestamp: Date.now() - 8 * 60 * 1000,
      href: "/profile?tab=stats",
      important: false,
    });
  }

  return feed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
};

export const readIdSetFromStorage = (key: string): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

export const writeIdSetToStorage = (key: string, values: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(values)));
};

export const readNotificationArchiveFromStorage = (): NotificationFeedItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ARCHIVED_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationFeedItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.timestamp === "number")
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

export const mergeAndPersistNotificationArchive = (incoming: NotificationFeedItem[]) => {
  if (typeof window === "undefined") return;
  const existing = readNotificationArchiveFromStorage();
  const mergedMap = new Map<string, NotificationFeedItem>();
  [...existing, ...incoming].forEach((item) => {
    const previous = mergedMap.get(item.id);
    if (!previous || item.timestamp >= previous.timestamp) {
      mergedMap.set(item.id, item);
    }
  });

  const merged = Array.from(mergedMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 300);

  window.localStorage.setItem(ARCHIVED_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
};

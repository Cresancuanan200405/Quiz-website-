"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Zap, Trophy, Target, Flame, X, CheckCheck } from "lucide-react";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import { useSettingsStore } from "@/lib/settingsStore";
import {
  ARCHIVED_NOTIFICATIONS_STORAGE_KEY,
  DISMISSED_NOTIFICATIONS_STORAGE_KEY,
  READ_NOTIFICATIONS_STORAGE_KEY,
  buildNotificationFeed,
  formatRelativeNotificationTime,
  mergeAndPersistNotificationArchive,
  readIdSetFromStorage,
  writeIdSetToStorage,
  type NotificationFeedItem,
  type NotificationFeedType,
} from "@/lib/notificationFeed";

type NotificationTab = "all" | "important" | "battle" | "trivia";

const notificationIconMap: Record<NotificationFeedType, React.ReactNode> = {
  battle: <Trophy className="h-4 w-4 text-cyan-500" />,
  quiz: <Target className="h-4 w-4 text-violet-500" />,
  achievement: <Flame className="h-4 w-4 text-amber-500" />,
  milestone: <Zap className="h-4 w-4 text-fuchsia-500" />,
};

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { quizHistory, bestStreak, totalPoints } = usePlayerStatsStore();
  const { battleHistory, wins, totalBattlePoints } = useBattleStatsStore();
  const { dailyReminder, challengeAlerts, emailNotifications } = useSettingsStore();

  const notifications = useMemo<NotificationFeedItem[]>(() => {
    return buildNotificationFeed({
      latestQuiz: quizHistory[0],
      latestBattle: battleHistory[0],
      bestStreak,
      totalPoints,
      totalBattlePoints,
      wins,
      dailyReminder,
      challengeAlerts,
      emailNotifications,
    });
  }, [battleHistory, bestStreak, challengeAlerts, dailyReminder, emailNotifications, quizHistory, totalBattlePoints, totalPoints, wins]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !dismissedIds.has(item.id)),
    [dismissedIds, notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return visibleNotifications;
    if (activeTab === "important") return visibleNotifications.filter((item) => item.important);
    if (activeTab === "battle") return visibleNotifications.filter((item) => item.type === "battle");
    return visibleNotifications.filter((item) => item.type === "quiz");
  }, [activeTab, visibleNotifications]);

  const unreadCount = visibleNotifications.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    if (typeof window === "undefined") return;

    setReadIds(readIdSetFromStorage(READ_NOTIFICATIONS_STORAGE_KEY));
    setDismissedIds(readIdSetFromStorage(DISMISSED_NOTIFICATIONS_STORAGE_KEY));

    setHasHydratedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedStorage) return;
    mergeAndPersistNotificationArchive(notifications);
  }, [hasHydratedStorage, notifications]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedStorage) return;
    writeIdSetToStorage(READ_NOTIFICATIONS_STORAGE_KEY, readIds);
  }, [hasHydratedStorage, readIds]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedStorage) return;
    writeIdSetToStorage(DISMISSED_NOTIFICATIONS_STORAGE_KEY, dismissedIds);
  }, [dismissedIds, hasHydratedStorage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleRemoveNotification = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleClearAll = () => {
    setDismissedIds(new Set(notifications.map((item) => item.id)));
  };

  const handleMarkAllAsRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      visibleNotifications.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const handleOpenNotification = (notification: NotificationFeedItem) => {
    handleMarkAsRead(notification.id);
    setIsOpen(false);
    router.push(notification.href);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="View notifications"
        onClick={() => setIsOpen(!isOpen)}
        className="focus-ring arcade-btn relative rounded-full border border-black/10 p-2 text-[var(--text-secondary)] hover:border-violet-400 hover:text-violet-500 dark:border-white/10 dark:text-white/80 dark:hover:text-violet-200 transition-colors duration-150"
      >
        <Bell className="h-4 w-4" />
        {hasHydratedStorage && unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-semibold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 rounded-card border dark:border-white/10 border-gray-200 dark:bg-[#1A1B2E] bg-white shadow-lg dark:shadow-2xl"
          >
            {/* Header */}
            <div className="border-b dark:border-white/10 border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="font-sora font-semibold text-[var(--text-primary)]">
                Notifications
              </p>
              <div className="flex items-center gap-1">
                {visibleNotifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    aria-label="Mark all notifications as read"
                    title="Mark all as read"
                    className="focus-ring grid h-7 w-7 place-items-center rounded-full border border-violet-300/45 bg-violet-500/10 text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-200"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {visibleNotifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex gap-1 border-b border-gray-200 px-2 py-2 dark:border-white/10">
              {([
                ["all", "All"],
                ["important", "Important"],
                ["battle", "Battles"],
                ["trivia", "Trivia"],
              ] as Array<[NotificationTab, string]>).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveTab(tabId)}
                  className={`focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeTab === tabId
                      ? "bg-violet-500/20 text-violet-700 dark:text-violet-100"
                      : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 mb-2 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No notifications in this filter
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`border-b dark:border-white/5 border-gray-100 p-4 transition-colors duration-100 ${
                      !readIds.has(notification.id)
                        ? "dark:bg-violet-500/5 bg-violet-50"
                        : "hover:dark:bg-white/5 hover:bg-gray-50"
                    }`}
                    onClick={() => handleOpenNotification(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{notificationIconMap[notification.type]}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {notification.title}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {formatRelativeNotificationTime(notification.timestamp)}
                        </p>
                        {notification.important ? (
                          <span className="mt-1 inline-flex rounded-full border border-violet-300/40 bg-violet-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200">
                            Important
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNotification(notification.id);
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {visibleNotifications.length > 0 && (
              <div className="border-t dark:border-white/10 border-gray-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/notifications");
                  }}
                  className="w-full text-center text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500 font-medium transition-colors"
                >
                  Open notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

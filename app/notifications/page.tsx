"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Flame, Target, Trophy, X, Zap } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  DISMISSED_NOTIFICATIONS_STORAGE_KEY,
  READ_NOTIFICATIONS_STORAGE_KEY,
  formatRelativeNotificationTime,
  readIdSetFromStorage,
  readNotificationArchiveFromStorage,
  writeIdSetToStorage,
  type NotificationFeedItem,
  type NotificationFeedType,
} from "@/lib/notificationFeed";

type NotificationTab = "all" | "important" | "battle" | "trivia";
type ReadTab = "all" | "unread" | "read";
type NotificationTimeBucket = "today" | "yesterday" | "earlier";

const PAGE_SIZE = 12;

const iconByType: Record<NotificationFeedType, React.ReactNode> = {
  battle: <Trophy className="h-4 w-4 text-cyan-500" />,
  quiz: <Target className="h-4 w-4 text-violet-500" />,
  achievement: <Flame className="h-4 w-4 text-amber-500" />,
  milestone: <Zap className="h-4 w-4 text-fuchsia-500" />,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [readFilter, setReadFilter] = useState<ReadTab>("all");
  const [archive, setArchive] = useState<NotificationFeedItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    const hydrate = () => {
      setArchive(readNotificationArchiveFromStorage());
      setReadIds(readIdSetFromStorage(READ_NOTIFICATIONS_STORAGE_KEY));
      setDismissedIds(readIdSetFromStorage(DISMISSED_NOTIFICATIONS_STORAGE_KEY));
    };

    hydrate();
    window.addEventListener("focus", hydrate);
    return () => window.removeEventListener("focus", hydrate);
  }, []);

  useEffect(() => {
    writeIdSetToStorage(READ_NOTIFICATIONS_STORAGE_KEY, readIds);
  }, [readIds]);

  useEffect(() => {
    writeIdSetToStorage(DISMISSED_NOTIFICATIONS_STORAGE_KEY, dismissedIds);
  }, [dismissedIds]);

  const filtered = useMemo(() => {
    return archive.filter((item) => {
      const matchesType = activeTab === "all"
        ? true
        : activeTab === "important"
          ? item.important
          : activeTab === "battle"
            ? item.type === "battle"
            : item.type === "quiz";

      const isRead = readIds.has(item.id);
      const matchesRead = readFilter === "all" ? true : readFilter === "read" ? isRead : !isRead;
      return matchesType && matchesRead;
    });
  }, [activeTab, archive, readFilter, readIds]);

  const visibleFiltered = useMemo(
    () => filtered.filter((item) => !dismissedIds.has(item.id)),
    [dismissedIds, filtered]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(visibleFiltered.length / PAGE_SIZE)),
    [visibleFiltered.length]
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, readFilter]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageStart = (page - 1) * PAGE_SIZE;
  const pagedItems = useMemo(
    () => visibleFiltered.slice(pageStart, pageStart + PAGE_SIZE),
    [pageStart, visibleFiltered]
  );

  const groupedPagedItems = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    const grouped: Record<NotificationTimeBucket, NotificationFeedItem[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    pagedItems.forEach((item) => {
      if (item.timestamp >= startOfToday) {
        grouped.today.push(item);
      } else if (item.timestamp >= startOfYesterday) {
        grouped.yesterday.push(item);
      } else {
        grouped.earlier.push(item);
      }
    });

    return grouped;
  }, [pagedItems]);

  const markOneAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const markAllAsRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const hideNotification = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const restoreDismissed = () => {
    setDismissedIds(new Set());
  };

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Notifications" />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <section className="glass rounded-card border border-black/10 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h1 className="font-sora text-2xl font-semibold text-[var(--text-primary)]">Notification History</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-violet-300/45 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-200"
                  aria-label="Mark filtered notifications as read"
                  title="Mark filtered notifications as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={restoreDismissed}
                  className="focus-ring rounded-full border border-cyan-300/40 bg-cyan-500/12 px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-cyan-500/20 dark:text-cyan-100"
                >
                  Restore hidden
                </button>
              </div>
            </div>

            <div className="mb-2 flex flex-wrap gap-2">
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
                  className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium ${
                    activeTab === tabId
                      ? "bg-violet-500/20 text-violet-700 dark:text-violet-100"
                      : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "unread", "read"] as ReadTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setReadFilter(tab)}
                  className={`focus-ring rounded-full px-3 py-1.5 text-xs capitalize ${
                    readFilter === tab
                      ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-100"
                      : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/10"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            {visibleFiltered.length ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-black/8 bg-white/65 px-3 py-2 text-xs text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5">
                  <p>
                    Showing {pageStart + 1}-{Math.min(visibleFiltered.length, pageStart + PAGE_SIZE)} of {visibleFiltered.length}
                  </p>
                  <p>Page {page} of {totalPages}</p>
                </div>

                {([
                  ["today", "Today"],
                  ["yesterday", "Yesterday"],
                  ["earlier", "Earlier"],
                ] as Array<[NotificationTimeBucket, string]>).map(([bucket, label]) => {
                  const entries = groupedPagedItems[bucket];
                  if (!entries.length) return null;

                  return (
                    <div key={bucket} className="space-y-2">
                      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {label}
                      </p>
                      {entries.map((item) => {
                        const isRead = readIds.has(item.id);

                        return (
                          <article
                            key={item.id}
                            className={`rounded-card border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-colors ${
                              isRead
                                ? "border-black/8 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5"
                                : "border-violet-300/35 bg-violet-500/8"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">{iconByType[item.type]}</div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                                  {item.important ? (
                                    <span className="rounded-full border border-violet-300/45 bg-violet-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-700 dark:text-violet-100">
                                      Important
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.description}</p>
                                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{formatRelativeNotificationTime(item.timestamp)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {!isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => markOneAsRead(item.id)}
                                    className="focus-ring rounded-full border border-violet-300/40 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-700 dark:text-violet-100"
                                  >
                                    Read
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    markOneAsRead(item.id);
                                    router.push(item.href);
                                  }}
                                  className="focus-ring rounded-full border border-cyan-300/40 bg-cyan-500/12 px-2 py-1 text-[10px] text-cyan-700 dark:text-cyan-100"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => hideNotification(item.id)}
                                  className="focus-ring rounded-full border border-black/10 p-1 text-[var(--text-secondary)] hover:border-rose-400 hover:text-rose-600 dark:border-white/15"
                                  aria-label="Hide notification"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  );
                })}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="focus-ring rounded-full border border-black/10 px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="focus-ring rounded-full border border-black/10 px-3 py-1.5 text-xs text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <article className="rounded-card border border-black/8 bg-white/70 p-6 text-center dark:border-white/10 dark:bg-white/5">
                <Bell className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
                <p className="mt-2 text-sm text-[var(--text-secondary)]">No notifications for this filter yet.</p>
              </article>
            )}
          </section>
        </div>
      </motion.main>
    </div>
  );
}

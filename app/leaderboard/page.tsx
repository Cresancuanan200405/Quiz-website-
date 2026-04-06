"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import LeaderboardRow from "@/components/LeaderboardRow";
import { currentUser, leaderboardUsers } from "@/lib/mockData";
import type { BoardTab } from "@/lib/types";

const tabs: BoardTab[] = ["global", "daily", "weekly"];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<BoardTab>("global");

  const rows = useMemo(() => {
    if (activeTab === "global") return leaderboardUsers;
    if (activeTab === "daily") return [...leaderboardUsers].sort((a, b) => b.accuracy - a.accuracy);
    return [...leaderboardUsers].sort((a, b) => b.quizCount - a.quizCount);
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Leaderboard" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl">
        <section className="glass mb-6 rounded-card p-5">
          <h1 className="font-sora text-2xl font-bold text-[var(--text-primary)]">Top Players</h1>
          <p className="text-sm text-[var(--text-secondary)]">Track the strongest minds across global, daily, and weekly ladders.</p>
        </section>

        <div className="mb-5 flex w-full max-w-md rounded-full border border-black/8 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-label={`Switch to ${tab} leaderboard`}
              onClick={() => setActiveTab(tab)}
              className="focus-ring relative flex-1 rounded-full px-3 py-2 text-sm capitalize text-[var(--text-secondary)]"
            >
              {activeTab === tab ? (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-full bg-violet-500/30"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                />
              ) : null}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>

        <div className="mb-2 hidden grid-cols-[70px_1.3fr_1fr_140px_120px] gap-3 px-4 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] md:grid">
          <span>Rank</span>
          <span>Player</span>
          <span>Score</span>
          <span>Accuracy</span>
          <span>Tier</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {rows.slice(0, 12).map((user, index) => (
              <LeaderboardRow
                key={`${activeTab}-${user.id}`}
                user={{ ...user, rank: index + 1 }}
                highlight={user.username === currentUser.username}
                index={index}
              />
            ))}
          </motion.div>
        </AnimatePresence>
        </div>
      </motion.main>
    </div>
  );
}

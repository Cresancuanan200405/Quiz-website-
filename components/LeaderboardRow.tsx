"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LeaderboardUser } from "@/lib/types";
import { medalForRank } from "@/lib/utils";

interface LeaderboardRowProps {
  user: LeaderboardUser;
  highlight?: boolean;
  index?: number;
  href?: string;
  compact?: boolean;
  showAccuracy?: boolean;
  activityLabel?: string;
}

export default function LeaderboardRow({ user, highlight, index = 0, href, compact = false, showAccuracy = true, activityLabel = "quizzes" }: LeaderboardRowProps) {
  const rowCols = compact
    ? showAccuracy
      ? "grid-cols-[56px_minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,120px)_92px]"
      : "grid-cols-[52px_minmax(0,1fr)_minmax(74px,92px)_minmax(88px,110px)]"
    : "grid-cols-[70px_1.3fr_1fr_140px_120px]";
  const rowPadding = compact ? "px-3 py-2.5" : "px-4 py-3";
  const medalText = compact ? "text-base" : "text-sm";
  const scoreText = compact ? "text-base" : "text-lg";

  const row = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className={`grid ${rowCols} items-center gap-3 overflow-hidden rounded-card border ${rowPadding} text-sm ${
        highlight
          ? compact
            ? "border-violet-400/40 bg-violet-500/10"
            : "sticky top-[74px] z-10 border-violet-400/40 bg-violet-500/10"
          : "border-black/8 bg-white/70 hover:translate-x-1 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
      }`}
    >
      <p className={`justify-self-start whitespace-nowrap font-semibold text-[var(--text-primary)] ${medalText}`}>{medalForRank(user.rank)}</p>
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-700 dark:text-violet-200">
          {user.avatar}
        </span>
        <div className="min-w-0">
          <p className="truncate text-left font-medium text-[var(--text-primary)]">{user.username}</p>
          <p className="text-xs text-[var(--text-secondary)]">{user.quizCount} {activityLabel}</p>
        </div>
      </div>
      <p className={`justify-self-start whitespace-nowrap font-sora font-semibold text-[var(--text-primary)] ${scoreText}`}>{user.score.toLocaleString()}</p>
      {showAccuracy ? (
        <div className="min-w-0">
          <div className="mb-1 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
              style={{ width: `${user.accuracy}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{user.accuracy}%</p>
        </div>
      ) : null}
      <span className="justify-self-start whitespace-nowrap rounded-full border border-black/8 bg-black/5 px-3 py-1 text-xs text-[var(--text-secondary)] dark:border-white/15 dark:bg-black/30 dark:text-white/80">
        {user.tier}
      </span>
    </motion.div>
  );

  if (!href) return row;

  return (
    <Link href={href} className="block focus-ring rounded-card" aria-label={`View ${user.username} profile`}>
      {row}
    </Link>
  );
}

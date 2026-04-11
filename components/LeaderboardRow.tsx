"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LeaderboardUser } from "@/lib/types";
import { medalForRank } from "@/lib/utils";
import ProfilePhoto from "@/components/ProfilePhoto";

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
  const tierClass = user.tier === "Legendary"
    ? "border-amber-300/55 bg-amber-500/18 text-amber-700 dark:border-amber-300/45 dark:bg-amber-400/18 dark:text-amber-100"
    : user.tier === "Expert"
      ? "border-fuchsia-300/55 bg-fuchsia-500/16 text-fuchsia-700 dark:border-fuchsia-300/45 dark:bg-fuchsia-400/16 dark:text-fuchsia-100"
      : user.tier === "Pro"
        ? "border-cyan-300/55 bg-cyan-500/16 text-cyan-700 dark:border-cyan-300/45 dark:bg-cyan-400/16 dark:text-cyan-100"
        : "border-slate-300/55 bg-slate-500/14 text-slate-700 dark:border-slate-300/35 dark:bg-slate-400/14 dark:text-slate-100";
  const topRankEffect = user.rank === 1
    ? "ring-1 ring-amber-300/45 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_12px_28px_rgba(245,158,11,0.28)]"
    : user.rank === 2
      ? "ring-1 ring-sky-300/45 shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_12px_24px_rgba(56,189,248,0.24)]"
      : user.rank === 3
        ? "ring-1 ring-emerald-300/45 shadow-[0_0_0_1px_rgba(16,185,129,0.28),0_12px_24px_rgba(16,185,129,0.24)]"
        : "";
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
      className={`grid ${rowCols} items-center gap-3 overflow-hidden rounded-card border ${rowPadding} text-sm ${topRankEffect} ${
        highlight
          ? compact
            ? "border-violet-400/40 bg-[linear-gradient(145deg,rgba(139,92,246,0.16),rgba(167,139,250,0.1),rgba(56,189,248,0.08))] shadow-[0_10px_24px_rgba(99,102,241,0.16)]"
            : "sticky top-[74px] z-10 border-violet-400/40 bg-[linear-gradient(145deg,rgba(139,92,246,0.16),rgba(167,139,250,0.1),rgba(56,189,248,0.08))] shadow-[0_12px_28px_rgba(99,102,241,0.2)]"
          : "border-black/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(248,250,252,0.72))] shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:translate-x-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(30,41,59,0.48),rgba(15,23,42,0.32))] dark:hover:bg-[linear-gradient(145deg,rgba(30,41,59,0.58),rgba(15,23,42,0.38))]"
      }`}
    >
      <p className={`justify-self-start whitespace-nowrap font-semibold text-[var(--text-primary)] ${medalText}`}>{medalForRank(user.rank)}</p>
      <div className="flex min-w-0 items-center gap-2">
        <ProfilePhoto
          photo={{ type: user.avatarType ?? "initials", value: user.avatarValue ?? user.avatar }}
          fallbackText={user.username}
          className="h-9 w-9 shrink-0 border border-violet-300/55"
          textClassName="text-xs"
        />
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
      <span className={`justify-self-start whitespace-nowrap rounded-full border px-3 py-1 text-xs ${tierClass}`}>
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

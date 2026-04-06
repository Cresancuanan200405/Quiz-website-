"use client";

import { motion } from "framer-motion";
import type { LeaderboardUser } from "@/lib/types";
import { medalForRank } from "@/lib/utils";

interface LeaderboardRowProps {
  user: LeaderboardUser;
  highlight?: boolean;
  index?: number;
}

export default function LeaderboardRow({ user, highlight, index = 0 }: LeaderboardRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className={`grid grid-cols-[70px_1.3fr_1fr_140px_120px] items-center gap-3 rounded-card border px-4 py-3 text-sm ${
        highlight
          ? "sticky top-[74px] z-10 border-violet-400/40 bg-violet-500/10"
          : "border-black/8 bg-white/70 hover:translate-x-1 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
      }`}
    >
      <p className="font-semibold text-[var(--text-primary)]">{medalForRank(user.rank)}</p>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-700 dark:text-violet-200">
          {user.avatar}
        </span>
        <div>
          <p className="font-medium text-[var(--text-primary)]">{user.username}</p>
          <p className="text-xs text-[var(--text-secondary)]">{user.quizCount} quizzes</p>
        </div>
      </div>
      <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{user.score.toLocaleString()}</p>
      <div>
        <div className="mb-1 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
            style={{ width: `${user.accuracy}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text-secondary)]">{user.accuracy}%</p>
      </div>
      <span className="justify-self-start rounded-full border border-black/8 bg-black/5 px-3 py-1 text-xs text-[var(--text-secondary)] dark:border-white/15 dark:bg-black/30 dark:text-white/80">
        {user.tier}
      </span>
    </motion.div>
  );
}

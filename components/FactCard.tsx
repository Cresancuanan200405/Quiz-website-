"use client";

import { Heart, Bookmark, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import type { TriviaFact } from "@/lib/types";
import { cx } from "@/lib/utils";

interface FactCardProps {
  fact: TriviaFact;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onNext: () => void;
  featured?: boolean;
}

export default function FactCard({
  fact,
  liked,
  saved,
  onLike,
  onSave,
  onNext,
  featured,
}: FactCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        "glass rounded-card p-4",
        featured && "border-l-4 border-amber-400 bg-amber-500/6"
      )}
    >
      {featured ? (
        <span className="mb-2 inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-200">
          Today&apos;s Pick
        </span>
      ) : null}
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full border border-black/8 bg-black/5 px-2 py-0.5 text-xs text-[var(--text-secondary)] dark:border-white/15 dark:bg-black/30 dark:text-white/70">
          {fact.category}
        </span>
      </div>
      <h3 className="mb-2 font-sora text-lg font-semibold text-[var(--text-primary)]">{fact.title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">{fact.body}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Like this fact"
          onClick={onLike}
          className={cx(
            "focus-ring arcade-btn flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs",
            liked
              ? "border-rose-400 bg-rose-500/20 text-rose-700 dark:text-rose-200"
              : "border-black/8 bg-white/70 text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5 dark:text-white/80"
          )}
        >
          <Heart className={cx("h-4 w-4", liked && "fill-current")} />
          {fact.likes + (liked ? 1 : 0)}
        </button>
        <button
          type="button"
          aria-label="Save this fact"
          onClick={onSave}
          className={cx(
            "focus-ring arcade-btn rounded-full border px-3 py-1.5 text-xs",
            saved
              ? "border-violet-400 bg-violet-500/20 text-violet-700 dark:text-violet-200"
              : "border-black/8 bg-white/70 text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5 dark:text-white/80"
          )}
        >
          <Bookmark className={cx("h-4 w-4", saved && "fill-current")} />
        </button>
        <button
          type="button"
          aria-label="Next fact"
          onClick={onNext}
          className="focus-ring arcade-btn ml-auto flex items-center gap-1 rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-violet-400 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
        >
          Next <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

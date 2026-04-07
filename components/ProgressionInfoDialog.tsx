"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { questionCountOptions } from "@/lib/quizProgression";

interface ProgressionInfoDialogProps {
  isOpen: boolean;
  categoryName: string;
  easyPassed: number;
  mediumPassed: number;
  hardPassed: number;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export default function ProgressionInfoDialog({
  isOpen,
  categoryName,
  easyPassed,
  mediumPassed,
  hardPassed,
  onConfirm,
  onCancel,
}: ProgressionInfoDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            className="glass w-full max-w-lg rounded-card border border-violet-400/25 bg-white/85 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.28)] dark:bg-slate-900/88"
          >
            <h3 className="font-sora text-lg font-bold text-[var(--text-primary)]">Difficulty Progression</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Unlock harder modes by clearing every question-count challenge for this category.
            </p>

            <div className="mt-4 rounded-card border border-black/8 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm text-[var(--text-secondary)]">
                Category: <span className="font-semibold text-[var(--text-primary)]">{categoryName}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Easy passed counts: <span className="font-semibold text-[var(--text-primary)]">{easyPassed}/{questionCountOptions.length}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Medium passed counts: <span className="font-semibold text-[var(--text-primary)]">{mediumPassed}/{questionCountOptions.length}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Hard passed counts: <span className="font-semibold text-[var(--text-primary)]">{hardPassed}/{questionCountOptions.length}</span>
              </p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Medium unlock: clear all Easy counts ({questionCountOptions.join(", ")})
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Hard unlock: clear all Medium counts ({questionCountOptions.join(", ")})
              </p>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => setDontShowAgain(event.target.checked)}
                className="h-4 w-4 rounded border-black/20 bg-transparent accent-violet-600"
              />
              Don&apos;t show this again
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="focus-ring rounded-button border border-black/10 bg-white/70 px-3 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(dontShowAgain)}
                className="focus-ring btn-primary rounded-button px-4 py-2 text-sm font-semibold"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

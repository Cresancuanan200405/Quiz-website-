"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, CircleX } from "lucide-react";
import { useNotificationStore, type ToastTone } from "@/lib/notificationStore";
import { cx } from "@/lib/utils";

const toneConfig: Record<ToastTone, { icon: React.ReactNode; className: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "border-green-400/40 bg-green-500/15 text-green-800 dark:text-green-200",
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    className: "border-sky-400/40 bg-sky-500/15 text-sky-800 dark:text-sky-200",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    className: "border-amber-400/40 bg-amber-500/15 text-amber-800 dark:text-amber-200",
  },
  error: {
    icon: <CircleX className="h-4 w-4" />,
    className: "border-rose-400/45 bg-rose-500/15 text-rose-800 dark:text-rose-200",
  },
};

export default function NotificationCenter() {
  const { notifications } = useNotificationStore();

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[120] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {notifications.map((note) => {
          const tone = toneConfig[note.tone];
          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cx(
                "glass pointer-events-auto rounded-card border px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-md",
                tone.className
              )}
            >
              <div className="flex items-center justify-center gap-2 font-medium">
                {tone.icon}
                <span>{note.message}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

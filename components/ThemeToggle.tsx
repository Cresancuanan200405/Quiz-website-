"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoonStar, SunMedium } from "lucide-react";
import { useThemeStore } from "@/lib/themeStore";

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        type="button"
        aria-label="Choose theme"
        onClick={() => setOpen((value) => !value)}
        whileHover={{ scale: 1.03 }}
        className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white/95 text-gray-700 shadow-sm dark:border-white/10 dark:bg-[#13172A] dark:text-white"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-amber-900 dark:bg-violet-500 dark:text-white">
          <SunMedium className="h-3 w-3" />
        </span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-36 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#111425]"
          >
            <button
              type="button"
              onClick={() => {
                setTheme("light");
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 ${theme === "light" ? "text-violet-600 dark:text-violet-300" : "text-gray-700 dark:text-white/80"}`}
            >
              <SunMedium className="h-4 w-4 text-amber-500" /> Light mode
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme("dark");
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 ${theme === "dark" ? "text-violet-600 dark:text-violet-300" : "text-gray-700 dark:text-white/80"}`}
            >
              <MoonStar className="h-4 w-4 text-violet-500" /> Dark mode
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

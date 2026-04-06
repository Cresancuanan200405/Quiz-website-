"use client";

import { useEffect, useState } from "react";
import { Flame, Coins, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { currentUser } from "@/lib/mockData";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useSidebarStore } from "@/lib/sidebarStore";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { isCollapsed, toggleMobile } = useSidebarStore();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <motion.header
      animate={{ marginLeft: isDesktop ? (isCollapsed ? 64 : 240) : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b dark:border-white/5 border-gray-100 dark:bg-[#0D0E1F]/95 bg-white/90 px-4 text-[var(--text-primary)] backdrop-blur-md md:px-7"
      style={{ marginLeft: 0 }}
    >
      <h1 className="font-sora text-lg font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          aria-label="Open menu"
          onClick={toggleMobile}
          className="focus-ring rounded-full border border-black/10 p-2 text-[var(--text-secondary)] hover:border-violet-400 hover:text-violet-500 dark:border-white/10 dark:text-white/80 md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-1 rounded-full dark:bg-amber-500/15 bg-amber-50 dark:text-amber-300 text-amber-800 dark:border-amber-400/20 border-amber-200 border px-3 py-1">
          <Flame className="h-4 w-4" /> {currentUser.streak}
        </span>
        <span className="hidden items-center gap-1 rounded-full dark:bg-violet-500/15 bg-violet-50 dark:text-violet-300 text-violet-800 px-3 py-1 sm:flex">
          <Coins className="h-4 w-4" /> {currentUser.points}
        </span>
        <NotificationDropdown />
        <ThemeToggle />
      </div>
    </motion.header>
  );
}


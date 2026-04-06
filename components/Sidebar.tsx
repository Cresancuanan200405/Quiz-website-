"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Swords,
  Trophy,
  BrainCircuit,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { useSidebarStore } from "@/lib/sidebarStore";
import { currentUser } from "@/lib/mockData";
import SidebarProfileMenu from "@/components/SidebarProfileMenu";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quiz", label: "Play Quiz", icon: BrainCircuit },
  { href: "/battle", label: "1v1 Battle", icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/trivia", label: "Trivia Hub", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isCollapsed,
    toggleSidebar,
    isMobileOpen,
    setMobileOpen,
  } = useSidebarStore();

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, [toggleSidebar]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${isCollapsed ? 64 : 240}px`
    );
  }, [isCollapsed]);

  return (
    <>
      <motion.aside
        animate={{ width: isCollapsed ? 64 : 240 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r dark:bg-[#0D0E1F] bg-white dark:border-white/5 border-gray-100 shadow-none dark:shadow-none lg:shadow-md md:flex"
      >
        <div className={cx("mb-6 mt-3 flex items-center px-3", isCollapsed ? "justify-center" : "gap-3") }>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/20 text-violet-300 shadow-violet-glow">
            <Zap className="h-5 w-5" />
          </div>
          <AnimatePresence>
            {!isCollapsed ? (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <p className="font-sora text-xl font-bold tracking-tight dark:text-white text-gray-900">QuizArena</p>
                <p className="text-xs dark:text-white/40 text-gray-400">Dark Arcade Premium</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Navigate to ${item.label}`}
                className={cx(
                  "focus-ring group relative flex items-center rounded-button border-l-2 border-transparent py-2.5 text-sm",
                  isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                  "dark:hover:bg-white/5 hover:bg-gray-50 dark:text-white/60 text-gray-500",
                  active && "dark:bg-violet-500/15 bg-violet-50 dark:text-violet-300 text-violet-700 dark:border-violet-400 border-violet-500"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed ? (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                {isCollapsed ? (
                  <span className="pointer-events-none absolute left-[58px] z-50 whitespace-nowrap rounded-lg border dark:border-white/10 border-gray-200 dark:bg-gray-900 bg-white px-3 py-1.5 text-[13px] dark:text-white text-gray-900 opacity-0 shadow-xl transition-all -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100">
                    {item.label}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t dark:border-white/5 border-gray-100 p-3">
          <SidebarProfileMenu
            isCollapsed={isCollapsed}
            onSignOut={() => {
              router.push("/login");
            }}
          />
        </div>

        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
          className="focus-ring absolute -right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-[var(--bg-card)] text-[var(--text-secondary)] shadow-md hover:scale-110 hover:border-violet-400 dark:border-white/10 dark:text-white/80"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </motion.aside>

      <AnimatePresence>
        {isMobileOpen ? (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              aria-label="Close sidebar overlay"
            />
            <motion.aside
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="glass fixed inset-y-0 left-0 z-50 flex w-60 flex-col p-4 md:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/20 text-violet-300">
                    <Zap className="h-5 w-5" />
                  </span>
                  <span className="font-sora text-xl font-semibold text-[var(--text-primary)] dark:text-white">QuizArena</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="focus-ring rounded-full border border-black/10 p-1 text-[var(--text-secondary)] dark:border-white/10 dark:text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`mobile-${item.href}`}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cx(
                        "focus-ring flex items-center gap-3 rounded-button border-l-2 px-3 py-2.5 text-sm",
                        active
                          ? "border-violet-400 bg-violet-500/15 text-violet-400 dark:text-violet-200"
                          : "border-transparent text-[var(--text-secondary)] dark:text-white/70"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto border-t dark:border-white/5 border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left"
                >
                  <p className="font-sora text-sm font-semibold text-[var(--text-primary)]">{currentUser.username}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{currentUser.tier}</p>
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

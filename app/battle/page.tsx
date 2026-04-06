"use client";

import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import BattleArena from "@/components/BattleArena";

export default function BattlePage() {
  return (
    <div className="h-screen overflow-hidden text-[var(--text-primary)]">
      <Sidebar />
      <TopBar title="1v1 Battle" />
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden px-3 py-3 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-6"
      >
        <div className="mx-auto flex w-full max-w-[1020px] min-h-0 flex-1 flex-col gap-3">
        <section className="glass rounded-card p-4">
          <h1 className="mb-1 font-sora text-2xl font-bold text-[var(--text-primary)]">Battle Queue</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Challenge a random player, answer faster, and dominate the arena rankings.
          </p>
        </section>
        <BattleArena />
        </div>
      </motion.main>
    </div>
  );
}

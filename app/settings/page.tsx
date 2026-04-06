"use client";

import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function SettingsPage() {
  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Settings" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <section className="glass rounded-card p-5">
            <h1 className="font-sora text-2xl font-bold text-[var(--text-primary)]">User Settings</h1>
            <p className="text-sm text-[var(--text-secondary)]">Configure account preferences, notifications, and gameplay behavior.</p>
          </section>

          <section className="glass rounded-card p-5">
            <p className="text-sm text-[var(--text-secondary)]">Settings controls can be added here.</p>
          </section>
        </div>
      </motion.main>
    </div>
  );
}

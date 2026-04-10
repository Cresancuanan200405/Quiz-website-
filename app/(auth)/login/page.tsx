"use client";

import { motion } from "framer-motion";
import LoginForm from "@/components/auth/LoginForm";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex dark:bg-[#0A0B14] bg-[#F8F7FF] transition-colors duration-300">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden dark:bg-[#0A0B14] bg-[#EEF0FF] flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px] animate-float-slow" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px] animate-float-medium" />
          <div className="absolute top-[40%] right-[-5%] w-[300px] h-[300px] rounded-full bg-blue-600/10 blur-[80px] animate-float-fast" />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
          </div>
          <span className="font-bold text-xl dark:text-white text-gray-900" style={{ fontFamily: "Sora,sans-serif" }}>QuizArena</span>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border dark:border-white/10 border-black/10 dark:bg-white/5 bg-white/60 backdrop-blur-sm w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-sm dark:text-white/70 text-gray-600" style={{ fontFamily: "DM Sans,sans-serif" }}>Now in Beta - Join 50,000+ players</span>
          </div>

          <div>
            <h1 className="font-black text-5xl xl:text-6xl leading-[1.05] dark:text-white text-gray-900" style={{ fontFamily: "Sora,sans-serif" }}>
              Quiz. Battle.
            </h1>
            <h1 className="font-black text-5xl xl:text-6xl leading-[1.05] animate-shimmer bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-400 bg-[length:200%_auto] bg-clip-text text-transparent" style={{ fontFamily: "Sora,sans-serif" }}>
              Dominate.
            </h1>
            <p className="mt-4 text-lg dark:text-white/55 text-gray-500 max-w-sm leading-relaxed" style={{ fontFamily: "DM Sans,sans-serif" }}>
              Challenge your mind. Crush your rivals.<br/>Climb the global leaderboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: "⚡", label: "10,000+ Questions" },
              { icon: "⚔️", label: "Live 1v1 Battles" },
              { icon: "🌍", label: "Global Leaderboard" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 px-4 py-2 rounded-full dark:bg-white/5 bg-white/70 dark:border-white/10 border-black/10 border backdrop-blur-sm dark:text-white/80 text-gray-700 text-sm font-medium hover:dark:border-violet-400/50 hover:border-violet-400/50 transition-colors cursor-default" style={{ fontFamily: "DM Sans,sans-serif" }}>
                <span>{f.icon}</span>{f.label}
              </div>
            ))}
          </div>

          <div className="relative h-32 hidden xl:block">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-8 dark:bg-white/8 bg-white/80 backdrop-blur-md rounded-2xl border dark:border-white/10 border-black/8 p-4 shadow-xl w-52"
            >
              <p className="text-xs font-semibold dark:text-white/50 text-gray-400 mb-2" style={{ fontFamily: "DM Sans,sans-serif" }}>Mini Leaderboard</p>
              {[ ["NovaByte", "16,840"], ["EchoDrift", "16,220"], ["QuantumVibe", "14,580"] ].map(([n, s], i) => (
                <div key={n} className="flex justify-between text-xs dark:text-white/80 text-gray-700 py-0.5" style={{ fontFamily: "DM Sans,sans-serif" }}>
                  <span>{i + 1}. {n}</span><span className="dark:text-violet-300 text-violet-600">{s}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-0 left-0 dark:bg-white/8 bg-white/80 backdrop-blur-md rounded-2xl border dark:border-amber-400/20 border-amber-300/40 p-4 shadow-xl shadow-amber-500/10"
            >
              <p className="text-xs dark:text-amber-400 text-amber-600 font-semibold mb-1" style={{ fontFamily: "DM Sans,sans-serif" }}>Your streak</p>
              <p className="text-2xl font-black dark:text-white text-gray-900" style={{ fontFamily: "Sora,sans-serif" }}>🔥 14 days</p>
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {["AB", "KL", "JM", "QT", "RX"].map((i, idx) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 dark:border-[#0A0B14] border-[#EEF0FF] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626"][idx] }}
              >
                {i}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm dark:text-white/80 text-gray-700 font-medium" style={{ fontFamily: "DM Sans,sans-serif" }}>Join 50,247 players competing today</p>
            <div className="flex items-center gap-1 mt-0.5">
              {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-xs">★</span>)}
              <span className="text-xs dark:text-white/40 text-gray-400 ml-1" style={{ fontFamily: "DM Sans,sans-serif" }}>4.9/5 from 12k reviews</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[45%] flex flex-col dark:bg-[#0D0E1F] bg-white border-l dark:border-white/5 border-black/8">
        <div className="flex items-center justify-between px-8 pt-8 pb-0">
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>
            </div>
            <span className="font-bold text-lg dark:text-white text-gray-900" style={{ fontFamily: "Sora,sans-serif" }}>QuizArena</span>
          </div>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="w-full max-w-[380px]">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

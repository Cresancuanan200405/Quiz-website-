"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BrainCircuit,
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  Shield,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { categoryMeta } from "@/lib/mockData";
import { buildAchievementProgress, getUnlockedAchievements, type AchievementRarity } from "@/lib/achievements";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";

type AchievementFilter = "all" | "unlocked" | "in-progress";

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  rarity: AchievementRarity;
  icon: React.ComponentType<{ className?: string }>;
  tone: "violet" | "cyan" | "emerald" | "amber";
}

const toneMap: Record<AchievementItem["tone"], string> = {
  violet: "border-violet-300/35 bg-violet-500/10",
  cyan: "border-cyan-300/35 bg-cyan-500/10",
  emerald: "border-emerald-300/35 bg-emerald-500/10",
  amber: "border-amber-300/35 bg-amber-500/10",
};

const rarityStyles: Record<AchievementRarity, string> = {
  Common: "border-slate-300/40 bg-slate-500/10 text-slate-700 dark:text-slate-200",
  Rare: "border-cyan-300/40 bg-cyan-500/12 text-cyan-700 dark:text-cyan-100",
  Epic: "border-violet-300/40 bg-violet-500/12 text-violet-700 dark:text-violet-100",
  Legendary: "border-amber-300/40 bg-amber-500/12 text-amber-700 dark:text-amber-100",
};

export default function AchievementsPage() {
  const [filter, setFilter] = useState<AchievementFilter>("unlocked");
  const { quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, bestStreak, totalPoints, quizHistory } = usePlayerStatsStore();
  const { battlesPlayed, wins, bestWinStreak, totalBattlePoints } = useBattleStatsStore();

  const accuracy = totalAnsweredQuestions > 0 ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 100) : 0;
  const winRate = battlesPlayed > 0 ? Math.round((wins / battlesPlayed) * 100) : 0;

  const achievements = useMemo<AchievementItem[]>(
    () =>
      buildAchievementProgress({
        quizzesCompleted,
        totalCorrectAnswers,
        bestStreak,
        totalPoints,
        battlesPlayed,
        wins,
        bestWinStreak,
        totalBattlePoints,
        quizHistory,
      }).map((item) => {
        const iconMap: Record<string, AchievementItem["icon"]> = {
          "first-journey": BrainCircuit,
          "journey-hundred": Target,
          "streak-master": Flame,
          "points-collector": Trophy,
          "battle-initiate": Swords,
          "battle-victor": Crown,
          "battle-hotstreak": Shield,
          "battle-points": Award,
          "category-mastery": Crown,
        };

        const toneMapById: Record<string, AchievementItem["tone"]> = {
          "first-journey": "violet",
          "journey-hundred": "cyan",
          "streak-master": "amber",
          "points-collector": "emerald",
          "battle-initiate": "violet",
          "battle-victor": "amber",
          "battle-hotstreak": "cyan",
          "battle-points": "emerald",
          "category-mastery": "violet",
        };

        return {
          ...item,
          icon: iconMap[item.id] ?? Award,
          tone: toneMapById[item.id] ?? "violet",
        };
      }),
    [battlesPlayed, bestStreak, bestWinStreak, quizHistory, quizzesCompleted, totalBattlePoints, totalCorrectAnswers, totalPoints, wins]
  );

  const unlockedCount = getUnlockedAchievements(achievements).length;
  const unlockedAchievements = achievements.filter((item) => item.progress >= item.goal);
  const completionRate = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;
  const masteredCategories = achievements.find((item) => item.id === "category-mastery")?.progress ?? 0;

  const filteredAchievements = achievements.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unlocked") return item.progress >= item.goal;
    return item.progress < item.goal;
  });

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Achievements" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <section className="glass relative overflow-hidden rounded-[28px] border border-violet-400/25 bg-gradient-to-br from-white/82 via-white/72 to-cyan-100/48 p-5 shadow-[0_16px_46px_rgba(15,23,42,0.2)] dark:from-slate-900/76 dark:via-slate-900/58 dark:to-cyan-900/22">
            <div className="pointer-events-none absolute -left-16 top-8 h-44 w-44 rounded-full bg-fuchsia-500/18 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 top-10 h-40 w-40 rounded-full bg-cyan-400/16 blur-3xl" />

            <div className="relative">
              <h1 className="font-sora text-3xl font-bold text-[var(--text-primary)]">Achievements</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Track unlocked badges, streak milestones, and battle rewards from your real account data.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-xl border border-violet-300/35 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Unlocked</p>
                  <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{unlockedCount}/{achievements.length}</p>
                </article>
                <article className="rounded-xl border border-cyan-300/35 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Completion</p>
                  <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{completionRate}%</p>
                </article>
                <article className="rounded-xl border border-emerald-300/35 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Trivia Accuracy</p>
                  <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{accuracy}%</p>
                </article>
                <article className="rounded-xl border border-amber-300/35 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Battle Win Rate</p>
                  <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{winRate}%</p>
                </article>
              </div>
            </div>
          </section>

          <section className="glass rounded-[24px] border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-slate-900/62">
            <div className="mb-3 inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
              {(["all", "unlocked", "in-progress"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`focus-ring rounded-full px-3 py-1.5 text-xs capitalize ${
                    filter === tab ? "bg-violet-500/25 text-violet-700 dark:text-violet-100" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {unlockedAchievements.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {unlockedAchievements.slice(0, 12).map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={`achievement-token-${item.id}`}
                      title={`${item.title} (${item.rarity})`}
                      whileHover={{ y: -2, scale: 1.06, rotateX: 8, rotateY: -6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      style={{ transformStyle: "preserve-3d" }}
                      className={`group relative grid h-9 w-9 place-items-center rounded-xl border [transform:perspective(600px)] ${rarityStyles[item.rarity]} shadow-[0_8px_14px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.42)]`}
                    >
                      <span className="pointer-events-none absolute left-1 top-1 h-2.5 w-5 rounded-full bg-white/35 blur-[2px]" />
                      <Icon className="relative z-10 h-4 w-4 drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]" />
                      <motion.span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-xl"
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ boxShadow: "0 0 12px rgba(99,102,241,0.35)" }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredAchievements.map((item) => {
                const unlocked = item.progress >= item.goal;
                const percent = Math.max(0, Math.min(100, Math.round((item.progress / item.goal) * 100)));
                const Icon = item.icon;

                return (
                  <motion.article
                    key={item.id}
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`rounded-[20px] border p-4 shadow-[0_10px_28px_rgba(15,23,42,0.12)] ${toneMap[item.tone]}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{item.title}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{item.description}</p>
                      </div>
                      <span className={`grid h-9 w-9 place-items-center rounded-full border ${unlocked ? "border-emerald-400/45 bg-emerald-500/14 text-emerald-700 dark:text-emerald-100" : "border-black/10 bg-white/70 text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5"}`}>
                        {unlocked ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${rarityStyles[item.rarity]}`}>{item.rarity}</span>
                    </div>

                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-black/7 dark:bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${unlocked ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-violet-500 to-cyan-400"}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>{Math.min(item.progress, item.goal)} / {item.goal}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${unlocked ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-100" : "border-black/10 bg-white/65 dark:border-white/15 dark:bg-white/5"}`}>
                        {unlocked ? "Unlocked" : <><Lock className="h-3 w-3" /> In Progress</>}
                      </span>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="glass rounded-[22px] border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-slate-900/62">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                <BrainCircuit className="h-4 w-4" /> Trivia Milestones
              </p>
              <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Quizzes Completed: <span className="font-semibold text-[var(--text-primary)]">{quizzesCompleted}</span></p>
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Total Correct Answers: <span className="font-semibold text-[var(--text-primary)]">{totalCorrectAnswers}</span></p>
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Best Trivia Streak: <span className="font-semibold text-[var(--text-primary)]">{bestStreak}</span></p>
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Grandmaster Categories: <span className="font-semibold text-[var(--text-primary)]">{masteredCategories}/{categoryMeta.length}</span></p>
              </div>
            </article>

            <article className="glass rounded-[22px] border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-slate-900/62">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                <Swords className="h-4 w-4" /> Battle Milestones
              </p>
              <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Battles Played: <span className="font-semibold text-[var(--text-primary)]">{battlesPlayed}</span></p>
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Wins: <span className="font-semibold text-[var(--text-primary)]">{wins}</span></p>
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Best Win Streak: <span className="font-semibold text-[var(--text-primary)]">{bestWinStreak}</span></p>
                <p className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 dark:border-white/10 dark:bg-white/5">Total Battle Points: <span className="font-semibold text-[var(--text-primary)]">{totalBattlePoints}</span></p>
              </div>
            </article>
          </section>
        </div>
      </motion.main>
    </div>
  );
}

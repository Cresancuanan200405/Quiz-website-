"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { getLeaderboardUserById } from "@/lib/leaderboard";
import { currentUser, triviaFacts } from "@/lib/mockData";
import type { ProfileTab } from "@/lib/types";
import { cx } from "@/lib/utils";

const tabs: ProfileTab[] = ["stats", "history", "saved"];

const profileTagLibrary = {
  tier: ["Legendary Mind", "Elite Solver", "Rank Climber", "Arcade Ace"],
  skill: ["Speed Thinker", "Accuracy Focus", "Category Master", "Battle Ready"],
  style: ["Night Owl", "Data Wizard", "Strategist", "Quiz Captain"],
} as const;

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [showCompare, setShowCompare] = useState(false);
  const { quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, totalPoints } = usePlayerStatsStore();

  const player = useMemo(
    () =>
      getLeaderboardUserById(params.id, {
        quizzesCompleted,
        totalCorrectAnswers,
        totalAnsweredQuestions,
        totalPoints,
      }),
    [params.id, quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, totalPoints]
  );

  const me = useMemo(
    () =>
      getLeaderboardUserById(currentUser.id, {
        quizzesCompleted,
        totalCorrectAnswers,
        totalAnsweredQuestions,
        totalPoints,
      }),
    [quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, totalPoints]
  );

  const hash = useMemo(() => (params.id ?? "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0), [params.id]);

  const profileMeta = useMemo(() => {
    if (!player) return null;

    if (player.id === currentUser.id) {
      return {
        handle: currentUser.handle,
        joinDate: currentUser.joinDate,
      };
    }

    const joinedMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][hash % 12];
    const joinedYear = 2021 + (hash % 5);

    return {
      handle: `@${player.username.toLowerCase()}`,
      joinDate: `Joined ${joinedMonth} ${joinedYear}`,
    };
  }, [hash, player]);

  const generatedTags = useMemo(() => {
    if (!player) return [];

    const tierTag = profileTagLibrary.tier[player.rank % profileTagLibrary.tier.length];
    const skillTag = profileTagLibrary.skill[player.accuracy % profileTagLibrary.skill.length];
    const styleTag = profileTagLibrary.style[player.quizCount % profileTagLibrary.style.length];

    return [tierTag, skillTag, styleTag, `${player.accuracy}% Accuracy`, `${player.quizCount} Quizzes`];
  }, [player]);

  const pointsGoal = useMemo(() => (player ? Math.max(10000, Math.ceil((player.score + 800) / 5000) * 5000) : 10000), [player]);
  const pointsProgress = useMemo(() => (player ? Math.max(10, Math.min(100, Math.round((player.score / pointsGoal) * 100))) : 10), [player, pointsGoal]);

  const generatedHistory = useMemo(() => {
    if (!player) return [];

    const categories = ["Science", "History", "Tech", "Nature", "Anime", "Food", "Animals", "Business"];
    const count = Math.min(6, Math.max(3, Math.round(player.quizCount / 80)));

    return Array.from({ length: count }, (_, index) => {
      const category = categories[(hash + index) % categories.length];
      const total = 10;
      const correct = Math.max(5, Math.min(10, Math.round((player.accuracy / 100) * total) - (index % 2)));
      const date = new Date();
      date.setDate(date.getDate() - (index + 1) * ((hash % 3) + 1));

      return {
        id: `${player.id}-${index}`,
        category,
        name: `${category} Challenge #${index + 1}`,
        score: `${correct}/${total}`,
        date: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      };
    });
  }, [hash, player]);

  const generatedSavedFacts = useMemo(() => {
    if (!player) return [];

    const size = Math.min(5, Math.max(2, Math.round(player.accuracy / 25)));
    const sorted = [...triviaFacts].sort((a, b) => ((a.id.charCodeAt(1) + hash) % 100) - ((b.id.charCodeAt(1) + hash) % 100));
    return sorted.slice(0, size);
  }, [hash, player]);

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Player Profile" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-5 overflow-x-hidden">
          {player ? (
            <>
              <section className="glass overflow-hidden rounded-card border border-violet-400/20 bg-gradient-to-br from-violet-100/70 via-white/80 to-cyan-100/50 p-0 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_0_60px_rgba(168,85,247,0.08)] dark:border-violet-400/25 dark:bg-none dark:shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_0_60px_rgba(168,85,247,0.12)]">
                <div className="relative px-6 pb-6 pt-6 sm:px-8">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_25%,rgba(236,72,153,0.12),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.1),transparent_40%),linear-gradient(120deg,rgba(76,29,149,0.08),rgba(15,23,42,0.02))] dark:bg-[radial-gradient(circle_at_12%_25%,rgba(236,72,153,0.22),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.2),transparent_40%),linear-gradient(120deg,rgba(76,29,149,0.2),rgba(15,23,42,0.06))]" />
                  <div className="pointer-events-none absolute -left-10 top-6 h-28 w-28 rounded-full bg-fuchsia-500/25 blur-3xl" />
                  <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl" />

                  <div className="relative z-10 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
                    <article className="rounded-card border border-violet-300/45 bg-gradient-to-br from-violet-200/70 via-white/80 to-fuchsia-100/60 p-5 shadow-[0_0_24px_rgba(168,85,247,0.14)] dark:border-violet-400/35 dark:from-violet-700/35 dark:via-violet-700/15 dark:to-fuchsia-500/12 dark:shadow-[0_0_24px_rgba(168,85,247,0.28)]">
                      <div className="relative mx-auto w-fit">
                        <div className="absolute inset-0 rounded-full bg-violet-400/25 blur-xl" />
                        <span className="grid h-36 w-36 place-items-center rounded-full border-[3px] border-violet-300/70 bg-violet-500/20 text-4xl font-semibold text-violet-100 shadow-[0_0_0_3px_rgba(168,85,247,0.18),0_0_30px_rgba(167,139,250,0.45)]">
                          {player.avatar}
                        </span>
                      </div>

                      <div className="mt-4 text-center">
                        <h1 className="font-sora text-5xl font-bold leading-none tracking-tight text-slate-900 dark:text-white/95">{player.username}</h1>
                        <p className="mt-2 text-3xl text-slate-600 dark:text-white/65">{profileMeta?.handle} • {profileMeta?.joinDate}</p>
                      </div>
                    </article>

                    <div className="space-y-4">
                      {[
                        {
                          title: "Trophy Case 1",
                          subtitle: "Performance Trophies",
                          tags: generatedTags.slice(0, 2),
                          tone: "from-rose-500/35 to-cyan-500/25",
                          border: "border-rose-300/45",
                        },
                        {
                          title: "Trophy Case 2",
                          subtitle: "Intellect Badges",
                          tags: generatedTags.slice(2, 4),
                          tone: "from-violet-500/30 to-indigo-500/20",
                          border: "border-violet-300/40",
                        },
                        {
                          title: "Trophy Case 3",
                          subtitle: "Player Identity",
                          tags: generatedTags.slice(4),
                          tone: "from-fuchsia-500/28 to-blue-500/22",
                          border: "border-fuchsia-300/40",
                        },
                      ].map((item) => (
                        <article key={item.title} className={cx("rounded-card border bg-gradient-to-r p-3.5 shadow-sm", item.border, "from-white/80 via-white/70 to-cyan-100/55 text-slate-900 dark:from-violet-500/30 dark:via-indigo-500/20 dark:to-cyan-500/20 dark:text-white") }>
                          <p className="font-sora text-lg font-semibold text-slate-900 dark:text-white/95">{item.title}</p>
                          <p className="text-sm text-slate-600 dark:text-white/65">{item.subtitle}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                              <span key={`${item.title}-${tag}`} className="inline-flex items-center gap-1 rounded-full border border-violet-300/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/20 dark:bg-black/20 dark:text-white/92">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="flex flex-col justify-between gap-5">
                      <article className="rounded-card border border-violet-300/45 bg-gradient-to-br from-fuchsia-100 via-violet-100 to-cyan-100 p-4 shadow-[0_0_22px_rgba(167,139,250,0.14)] dark:from-fuchsia-500/18 dark:via-violet-500/20 dark:to-cyan-500/20 dark:shadow-[0_0_22px_rgba(167,139,250,0.25)]">
                        <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">Total Score</p>
                        <p className="mt-1 text-center font-sora text-5xl font-bold text-slate-900 dark:text-white">
                          <span className="inline-flex items-center gap-2">
                            <Star className="h-6 w-6" />
                            {player.score.toLocaleString()}
                          </span>
                        </p>

                        <div className="mt-4">
                          <div className="h-4 rounded-full border border-violet-200/70 bg-white/80 p-1 dark:border-white/20 dark:bg-black/35">
                            <div
                              className="relative h-full rounded-full bg-[linear-gradient(90deg,#a855f7_0%,#ec4899_45%,#22d3ee_100%)] shadow-[0_0_16px_rgba(168,85,247,0.4)]"
                              style={{ width: `${pointsProgress}%` }}
                            >
                              <span className="absolute -right-1 top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                            </div>
                          </div>
                          <div className="mt-1 flex justify-between text-sm text-slate-600 dark:text-white/75">
                            <span>Rank #{player.rank}</span>
                            <span>{player.tier}</span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-violet-200/60 pt-3 text-center dark:border-white/15">
                          <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-white/70">Quizzes</p>
                          <p className="mt-1 font-sora text-2xl font-semibold text-slate-900 dark:text-white">{player.quizCount}</p>
                        </div>
                      </article>

                      <Link href="/leaderboard" className="focus-ring ml-auto rounded-lg border border-fuchsia-300/60 bg-fuchsia-500/20 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_0_16px_rgba(232,121,249,0.18)] hover:bg-fuchsia-500/28 dark:text-white dark:shadow-[0_0_16px_rgba(232,121,249,0.35)]">
                        Back to Leaderboard
                      </Link>
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 border-t border-black/10 pt-4 dark:border-white/10">
                    <div className="inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
                      {tabs.map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveTab(tab)}
                          className={cx(
                            "focus-ring arcade-btn rounded-full px-4 py-1.5 text-sm capitalize transition-all duration-150",
                            activeTab === tab ? "bg-violet-500/35 text-slate-900 dark:text-violet-100" : "text-slate-600 dark:text-[var(--text-secondary)]"
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCompare((value) => !value)}
                  className="focus-ring rounded-lg border border-fuchsia-300/60 bg-fuchsia-500/15 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_0_16px_rgba(232,121,249,0.16)] hover:bg-fuchsia-500/25 dark:text-white dark:shadow-[0_0_16px_rgba(232,121,249,0.28)]"
                >
                  {showCompare ? "Hide Compare" : "Compare with Me"}
                </button>
              </div>

              {showCompare && player.id !== currentUser.id && me ? (
                <section className="rounded-card border border-violet-300/25 bg-gradient-to-r from-violet-100 via-fuchsia-50 to-cyan-100 p-4 shadow-[0_0_16px_rgba(168,85,247,0.12)] dark:from-violet-500/10 dark:via-fuchsia-500/8 dark:to-cyan-500/10 dark:shadow-[0_0_16px_rgba(168,85,247,0.2)]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="font-sora text-sm font-semibold text-slate-900 dark:text-white">Compare vs Me</p>
                    <span className="text-xs text-slate-600 dark:text-white/65">{me.username} vs {player.username}</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-card border border-black/10 bg-white/70 p-3 dark:border-white/15 dark:bg-black/20">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-white/60">You</p>
                      <p className="mt-1 font-sora text-xl font-semibold text-slate-900 dark:text-white">{me.score.toLocaleString()} pts</p>
                      <p className="text-sm text-slate-600 dark:text-white/70">Accuracy {me.accuracy}%</p>
                    </article>
                    <article className="rounded-card border border-black/10 bg-white/70 p-3 dark:border-white/15 dark:bg-black/20">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-white/60">{player.username}</p>
                      <p className="mt-1 font-sora text-xl font-semibold text-slate-900 dark:text-white">{player.score.toLocaleString()} pts</p>
                      <p className="text-sm text-slate-600 dark:text-white/70">Accuracy {player.accuracy}%</p>
                    </article>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-violet-300/35 bg-violet-500/15 px-2.5 py-1 text-violet-700 dark:text-violet-100">
                      Score diff: {player.score - me.score >= 0 ? "+" : ""}{(player.score - me.score).toLocaleString()}
                    </span>
                    <span className="rounded-full border border-cyan-300/35 bg-cyan-500/12 px-2.5 py-1 text-cyan-700 dark:text-cyan-100">
                      Accuracy diff: {player.accuracy - me.accuracy >= 0 ? "+" : ""}{player.accuracy - me.accuracy}%
                    </span>
                    <span className="rounded-full border border-fuchsia-300/35 bg-fuchsia-500/12 px-2.5 py-1 text-fuchsia-700 dark:text-fuchsia-100">
                      Rank diff: {me.rank - player.rank >= 0 ? "+" : ""}{me.rank - player.rank}
                    </span>
                  </div>
                </section>
              ) : null}

              {activeTab === "stats" ? (
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Accuracy", `${player.accuracy}%`],
                    ["Rank", `#${player.rank}`],
                    ["Tier", player.tier],
                    ["Score", `${player.score.toLocaleString()}`],
                    ["Quizzes", `${player.quizCount}`],
                    ["Points Goal", `${pointsGoal.toLocaleString()}`],
                  ].map(([label, value]) => (
                    <article key={label} className="rounded-card border border-violet-300/30 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 p-4 shadow-[0_0_18px_rgba(167,139,250,0.12)] dark:from-violet-500/14 dark:via-fuchsia-500/8 dark:to-cyan-500/12 dark:shadow-[0_0_18px_rgba(167,139,250,0.2)]">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">{label}</p>
                      <p className="mt-1 font-sora text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
                    </article>
                  ))}
                </section>
              ) : null}

              {activeTab === "history" ? (
                <section className="space-y-2">
                  {generatedHistory.map((item) => (
                    <article key={item.id} className="rounded-card border border-violet-300/30 bg-gradient-to-r from-violet-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(129,140,248,0.12)] dark:from-violet-500/12 dark:via-violet-500/6 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(129,140,248,0.18)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-slate-600 dark:text-white/65">{item.category} • {item.date}</p>
                        </div>
                        <span className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 text-sm text-cyan-700 dark:text-cyan-100">
                          {item.score}
                        </span>
                      </div>
                    </article>
                  ))}
                </section>
              ) : null}

              {activeTab === "saved" ? (
                <section className="space-y-2">
                  {generatedSavedFacts.map((fact) => (
                    <article key={fact.id} className="rounded-card border border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(217,70,239,0.12)] dark:from-fuchsia-500/12 dark:via-violet-500/8 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(217,70,239,0.16)]">
                      <p className="mb-1 text-xs text-fuchsia-700 dark:text-fuchsia-100">{fact.category}</p>
                      <h3 className="font-sora text-lg font-semibold text-slate-900 dark:text-white">{fact.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-white/75">{fact.body}</p>
                    </article>
                  ))}
                </section>
              ) : null}
            </>
          ) : (
            <section className="glass rounded-card border border-violet-400/20 p-6">
              <p className="text-[var(--text-secondary)]">Player not found.</p>
              <Link href="/leaderboard" className="mt-3 inline-block text-sm text-violet-300">
                Return to leaderboard
              </Link>
            </section>
          )}
        </div>
      </motion.main>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowLeftRight, Award, BrainCircuit, Clock3, Lock, Swords, Trophy } from "lucide-react";
import ProfilePhoto from "@/components/ProfilePhoto";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { fetchPublicPlayerCardByProfileKey, type PublicPlayerCardData } from "@/lib/supabase/playerCards";
import { getActiveProfileKey } from "@/lib/supabase/profileKey";

type PlayerTab = "stats" | "history" | "saved";

const tabs: PlayerTab[] = ["stats", "history", "saved"];

const profileTagLibrary = {
  Titles: [
    "Grandmaster",
    "Rookie",
    "Strategist",
    "Night Owl",
    "Data Wizard",
    "Quiz Captain",
    "Brainstormer",
    "Tactician",
    "Speed Thinker",
    "Elite Solver",
  ],
  Hobbies: [
    "Tech Enthusiast",
    "History Buff",
    "Sci-Fi Fan",
    "Gamer",
    "Bookworm",
    "Music Lover",
    "Anime Watcher",
    "Film Nerd",
    "Nature Explorer",
    "Puzzle Collector",
  ],
  Achievements: [
    "Streak x10",
    "Speedster",
    "Flawless",
    "Top 10",
    "Battle MVP",
    "Trivia Streak",
    "Quick Learner",
    "Perfect Round",
    "Underdog Win",
    "Marathon Mode",
  ],
} as const;

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<PlayerTab>("stats");
  const [player, setPlayer] = useState<PublicPlayerCardData | null>(null);
  const [me, setMe] = useState<PublicPlayerCardData | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myProfileKey, setMyProfileKey] = useState<string | null>(null);

  const profileKey = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const isSelfProfile = myProfileKey !== null && profileKey === myProfileKey;

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      void (async () => {
        const resolved = await getActiveProfileKey();
        setMyProfileKey(resolved);
      })();
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, []);

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      setIsLoading(true);

      void (async () => {
        const payload = await fetchPublicPlayerCardByProfileKey(profileKey);
        setPlayer(payload);
        setIsLoading(false);
      })();
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, [profileKey]);

  useEffect(() => {
    if (isSelfProfile || !myProfileKey) return;

    const kickoff = window.setTimeout(() => {
      void (async () => {
        const payload = await fetchPublicPlayerCardByProfileKey(myProfileKey);
        setMe(payload);
      })();
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, [isSelfProfile, myProfileKey]);

  const comparison = useMemo(() => {
    if (!player || !me) return null;

    const journeyDelta = player.trivia.points - me.trivia.points;
    const battleDelta = player.battle.points - me.battle.points;
    const accuracyDelta = player.trivia.accuracy - me.trivia.accuracy;
    const winRateDelta = player.battle.winRate - me.battle.winRate;

    return {
      journeyDelta,
      battleDelta,
      accuracyDelta,
      winRateDelta,
    };
  }, [me, player]);

  const formatSigned = (value: number, suffix = "") => `${value >= 0 ? "+" : ""}${value}${suffix}`;
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleString();
  };

  const privateBlocked = !isLoading && !player && myProfileKey !== null && !isSelfProfile;
  const notFound = !isLoading && !player && !privateBlocked;

  const achievementCompletion = player?.achievements.total
    ? Math.round((player.achievements.unlocked / player.achievements.total) * 100)
    : 0;

  const groupedProfileTags = useMemo(() => {
    if (!player) return [] as Array<{ title: string; tags: string[] }>;
    const selectedTags = new Set(player.tags);

    return Object.entries(profileTagLibrary)
      .map(([title, options]) => ({
        title,
        tags: options.filter((tag) => selectedTags.has(tag)),
      }));
  }, [player]);

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
        <div className="mx-auto w-full max-w-6xl space-y-4">
          {isLoading ? (
            <section className="glass rounded-card border border-violet-400/20 p-6 text-sm text-[var(--text-secondary)]">
              Loading player profile...
            </section>
          ) : null}

          {privateBlocked ? (
            <section className="glass rounded-card border border-violet-400/20 p-6">
              <div className="mx-auto max-w-lg rounded-3xl border border-violet-300/35 bg-gradient-to-br from-violet-100/80 via-white/80 to-fuchsia-100/70 p-6 text-center dark:from-violet-500/14 dark:via-slate-900/50 dark:to-fuchsia-500/14">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-violet-300/45 bg-violet-500/15 text-violet-700 dark:text-violet-100">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="font-sora text-xl font-semibold text-[var(--text-primary)]">This profile is private</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">This player disabled public profile visibility. Only their own account can view this page.</p>
              </div>
              <Link href="/leaderboard" className="mt-4 inline-block text-sm text-violet-700 dark:text-violet-200">
                Back to Leaderboard
              </Link>
            </section>
          ) : null}

          {notFound ? (
            <section className="glass rounded-card border border-violet-400/20 p-6">
              <p className="text-[var(--text-secondary)]">Player profile was not found for this profile key.</p>
              <Link href="/leaderboard" className="mt-3 inline-block text-sm text-violet-700 dark:text-violet-200">
                Back to Leaderboard
              </Link>
            </section>
          ) : null}

          {player ? (
            <>
              <section className="glass relative overflow-hidden rounded-card border border-violet-400/20 bg-gradient-to-br from-violet-100/70 via-white/80 to-cyan-100/50 p-6 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_0_60px_rgba(168,85,247,0.08)] dark:border-violet-400/25 dark:bg-none dark:shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_0_60px_rgba(168,85,247,0.12)]">
                <div className="pointer-events-none absolute -left-14 top-6 h-44 w-44 rounded-full bg-fuchsia-500/16 blur-3xl" />
                <div className="pointer-events-none absolute -right-12 top-8 h-44 w-44 rounded-full bg-cyan-400/18 blur-3xl" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_25%,rgba(236,72,153,0.12),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.1),transparent_40%),linear-gradient(120deg,rgba(76,29,149,0.08),rgba(15,23,42,0.02))] dark:bg-[radial-gradient(circle_at_12%_25%,rgba(236,72,153,0.22),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.2),transparent_40%),linear-gradient(120deg,rgba(76,29,149,0.2),rgba(15,23,42,0.06))]" />

                <div className="relative mb-3 flex justify-start">
                  <Link
                    href="/dashboard"
                    aria-label="Back to dashboard"
                    title="Back to dashboard"
                    className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-violet-300/55 bg-violet-500/14 text-violet-700 transition-all hover:-translate-y-0.5 hover:bg-violet-500/24 dark:border-violet-300/30 dark:text-violet-100"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </div>

                <div className="relative grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                  <article className="rounded-[24px] border border-violet-300/40 bg-white/65 p-4 dark:border-white/15 dark:bg-black/20">
                    <div className="grid place-items-center">
                      <div className="relative mx-auto w-fit">
                        {player.showOnlineStatus ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.26)_0%,rgba(74,222,128,0.12)_42%,rgba(74,222,128,0)_72%)] blur-lg"
                            />
                            <motion.span
                              aria-hidden="true"
                              className="pointer-events-none absolute -inset-2 rounded-full border-2 border-emerald-300/75 shadow-[0_0_0_2px_rgba(16,185,129,0.22),0_0_30px_rgba(74,222,128,0.62)]"
                              animate={{ opacity: [0.72, 1, 0.72], scale: [0.99, 1.02, 0.99] }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </>
                        ) : null}
                        <ProfilePhoto
                          photo={player.photo}
                          fallbackText={player.displayName}
                          className={`h-32 w-32 border-[3px] ${player.showOnlineStatus ? "border-emerald-300/80" : "border-violet-300/70"}`}
                          textClassName="text-4xl"
                          neon
                        />
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <h1 className="font-sora text-3xl font-bold text-[var(--text-primary)]">{player.displayName}</h1>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{player.handle}</p>
                      <p className="mt-3 rounded-2xl border border-black/8 bg-white/70 px-3 py-2 text-left text-sm leading-relaxed text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5">
                        {player.bio || "This player has not added a bio yet."}
                      </p>
                    </div>
                  </article>

                  <div className="space-y-3">
                    <article className="rounded-[22px] border border-violet-300/40 bg-white/65 p-4 dark:border-white/15 dark:bg-black/20">
                      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                        <BrainCircuit className="h-4 w-4" /> Trivia Journey
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Rank</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.trivia.rank ? `#${player.trivia.rank}` : "-"}</p>
                        </div>
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Points</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.trivia.points}</p>
                        </div>
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Accuracy</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.trivia.accuracy}%</p>
                        </div>
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Best Streak</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.trivia.bestStreak}</p>
                        </div>
                      </div>
                    </article>

                    <article className="rounded-[22px] border border-cyan-300/45 bg-white/65 p-4 dark:border-cyan-400/30 dark:bg-black/20">
                      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                        <Swords className="h-4 w-4" /> 1v1 Battle
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-5">
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Rank</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.battle.rank ? `#${player.battle.rank}` : "-"}</p>
                        </div>
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Points</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.battle.points}</p>
                        </div>
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">W-L-D</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.battle.wins}-{player.battle.losses}-{player.battle.draws}</p>
                        </div>
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Win Rate</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.battle.winRate}%</p>
                        </div>
                        <div className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)]">Tier</p>
                          <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{player.tier}</p>
                        </div>
                      </div>
                    </article>

                    <article className="rounded-[22px] border border-fuchsia-300/40 bg-white/65 p-4 dark:border-fuchsia-400/30 dark:bg-black/20">
                      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-200">
                        <Award className="h-4 w-4" /> Achievement Progress
                      </p>
                      <div className="mt-3 rounded-xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                          <span>{player.achievements.unlocked}/{player.achievements.total} unlocked</span>
                          <span>{achievementCompletion}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500" style={{ width: `${achievementCompletion}%` }} />
                        </div>
                      </div>
                    </article>

                  </div>
                </div>
              </section>

              <section className="glass rounded-[22px] border border-violet-300/30 bg-gradient-to-r from-violet-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(129,140,248,0.12)] dark:from-violet-500/12 dark:via-violet-500/6 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(129,140,248,0.18)]">
                <h2 className="mb-3 font-sora text-lg font-semibold text-[var(--text-primary)]">Profile Tags</h2>
                <div className="space-y-3">
                  {groupedProfileTags.map((group) => (
                    <article key={`tag-section-${group.title}`} className="rounded-xl border border-black/8 bg-white/65 p-3 dark:border-white/10 dark:bg-white/5">
                      <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{group.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        {group.tags.length ? (
                          group.tags.map((tag) => (
                            <span key={`${group.title}-${tag}`} className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-2.5 py-1 text-xs text-white">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">No {group.title.toLowerCase()} selected.</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="glass rounded-card border border-violet-300/30 bg-gradient-to-br from-violet-100/70 via-white/75 to-cyan-100/45 p-4 dark:border-violet-400/20 dark:bg-white/5">
                <div className="inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`focus-ring rounded-full px-4 py-1.5 text-sm capitalize transition-all ${
                        activeTab === tab ? "bg-violet-500/35 text-slate-900 dark:text-violet-100" : "text-slate-600 dark:text-[var(--text-secondary)]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="mt-4"
                  >
                    {activeTab === "stats" ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          ["Journey Power", `${player.rankings.triviaPower.score} • ${player.rankings.triviaPower.rank}`],
                          ["Journey Precision", `${player.rankings.triviaPrecision.score} • ${player.rankings.triviaPrecision.rank}`],
                          ["Journey Consistency", `${player.rankings.triviaConsistency.score} • ${player.rankings.triviaConsistency.rank}`],
                          ["Battle Power", `${player.rankings.battlePower.score} • ${player.rankings.battlePower.rank}`],
                          ["Battle Clutch", `${player.rankings.battleClutch.score} • ${player.rankings.battleClutch.rank}`],
                          ["Battle Consistency", `${player.rankings.battleConsistency.score} • ${player.rankings.battleConsistency.rank}`],
                        ].map(([label, value]) => (
                          <article key={label} className="rounded-card border border-violet-300/30 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 p-4 shadow-[0_0_18px_rgba(167,139,250,0.12)] dark:from-violet-500/14 dark:via-fuchsia-500/8 dark:to-cyan-500/12 dark:shadow-[0_0_18px_rgba(167,139,250,0.2)]">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">{label}</p>
                            <p className="mt-1 font-sora text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    {activeTab === "history" ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <article className="rounded-card border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <h3 className="mb-2 inline-flex items-center gap-2 font-sora text-base font-semibold text-[var(--text-primary)]">
                            <Trophy className="h-4 w-4 text-violet-500" /> Trivia Journey Sessions
                          </h3>
                          <div className="space-y-2">
                            {player.recentTrivia.length ? (
                              player.recentTrivia.map((entry, index) => (
                                <div key={`recent-trivia-${index}`} className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                                  <p className="font-medium text-[var(--text-primary)]">{entry.category} • {entry.difficulty}</p>
                                  <p className="text-xs text-[var(--text-secondary)]">{entry.correct}/{entry.total} • {entry.points} pts • {formatDate(entry.completed_at)}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-[var(--text-secondary)]">No Trivia Journey sessions yet.</p>
                            )}
                          </div>
                        </article>

                        <article className="rounded-card border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <h3 className="mb-2 inline-flex items-center gap-2 font-sora text-base font-semibold text-[var(--text-primary)]">
                            <Clock3 className="h-4 w-4 text-cyan-500" /> 1v1 Battle Sessions
                          </h3>
                          <div className="space-y-2">
                            {player.recentBattle.length ? (
                              player.recentBattle.map((entry, index) => {
                                const isWin = entry.result === "win";
                                const isLoss = entry.result === "loss";
                                const badgeClass = isWin
                                  ? "border-emerald-300/55 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-400/15 dark:text-emerald-100"
                                  : isLoss
                                    ? "border-rose-300/55 bg-rose-500/15 text-rose-700 dark:border-rose-400/45 dark:bg-rose-400/15 dark:text-rose-100"
                                    : "border-amber-300/55 bg-amber-500/15 text-amber-700 dark:border-amber-400/45 dark:bg-amber-400/15 dark:text-amber-100";
                                const shellClass = isWin
                                  ? "border-emerald-300/35 bg-[linear-gradient(140deg,rgba(236,253,245,0.9),rgba(209,250,229,0.6))] dark:border-emerald-400/25 dark:bg-[linear-gradient(140deg,rgba(16,185,129,0.18),rgba(16,185,129,0.08))]"
                                  : isLoss
                                    ? "border-rose-300/35 bg-[linear-gradient(140deg,rgba(255,241,242,0.9),rgba(254,205,211,0.55))] dark:border-rose-400/25 dark:bg-[linear-gradient(140deg,rgba(244,63,94,0.2),rgba(251,113,133,0.08))]"
                                    : "border-amber-300/35 bg-[linear-gradient(140deg,rgba(255,251,235,0.9),rgba(254,240,138,0.45))] dark:border-amber-400/25 dark:bg-[linear-gradient(140deg,rgba(245,158,11,0.2),rgba(251,191,36,0.08))]";

                                return (
                                  <div key={`recent-battle-${index}`} className={`rounded-2xl border px-3 py-2 text-sm shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-md dark:shadow-[0_10px_26px_rgba(15,23,42,0.32)] ${shellClass}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="font-medium text-[var(--text-primary)]">{entry.mode} • vs {entry.opponent_name}</p>
                                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${badgeClass}`}>
                                        {entry.result.toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.category} • {entry.user_score}-{entry.opponent_score} • {formatDate(entry.played_at)}</p>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-[var(--text-secondary)]">No 1v1 battle sessions yet.</p>
                            )}
                          </div>
                        </article>
                      </div>
                    ) : null}

                    {activeTab === "saved" ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <article className="rounded-card border border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(217,70,239,0.12)] dark:from-fuchsia-500/12 dark:via-violet-500/8 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(217,70,239,0.16)]">
                          <h3 className="font-sora text-base font-semibold text-slate-900 dark:text-white">Saved Trivia Facts</h3>
                          <p className="mt-1 text-xs text-slate-600 dark:text-white/70">Visible saved facts synced from this player profile.</p>
                          <div className="mt-3 space-y-2">
                            {player.saved.factIds.length ? (
                              player.saved.factIds.map((factId) => (
                                <div key={factId} className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                                  Fact ID: {factId}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-[var(--text-secondary)]">No synced saved facts available for this player.</p>
                            )}
                          </div>
                        </article>

                        <article className="rounded-card border border-violet-300/30 bg-gradient-to-r from-violet-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(129,140,248,0.12)] dark:from-violet-500/12 dark:via-violet-500/6 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(129,140,248,0.18)]">
                          <h3 className="font-sora text-base font-semibold text-slate-900 dark:text-white">Saved Playstyle</h3>
                          <p className="mt-1 text-xs text-slate-600 dark:text-white/70">Most-played categories and profile tags.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {player.saved.favoriteCategories.length ? (
                              player.saved.favoriteCategories.map((category) => (
                                <span key={category} className="rounded-full border border-cyan-300/45 bg-cyan-500/12 px-2.5 py-1 text-xs text-cyan-700 dark:text-cyan-100">
                                  {category}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[var(--text-secondary)]">No favorite categories identified yet.</span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {player.tags.length ? (
                              player.tags.map((tag) => (
                                <span key={tag} className="rounded-full border border-violet-300/35 bg-violet-500/14 px-2.5 py-1 text-xs text-violet-700 dark:text-violet-100">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[var(--text-secondary)]">No profile tags yet.</span>
                            )}
                          </div>
                        </article>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </section>

              {!isSelfProfile ? (
                <section className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCompare((value) => !value)}
                    className={`focus-ring grid h-11 w-11 place-items-center rounded-full border transition-all ${
                      showCompare
                        ? "border-violet-400/45 bg-violet-500/20 text-violet-700 dark:text-violet-100"
                        : "border-fuchsia-300/55 bg-fuchsia-500/14 text-fuchsia-700 dark:text-fuchsia-100"
                    }`}
                    aria-label="Compare with me"
                    title="Compare with me"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                  </button>
                </section>
              ) : null}

              {showCompare && comparison && me ? (
                <section className="glass rounded-[24px] border border-fuchsia-300/35 bg-gradient-to-br from-fuchsia-100/70 via-white/80 to-violet-100/65 p-4 shadow-[0_16px_40px_rgba(168,85,247,0.2)] dark:from-fuchsia-500/14 dark:via-slate-900/55 dark:to-violet-500/14">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-sora text-lg font-semibold text-[var(--text-primary)]">Compare with Me</h2>
                    <p className="text-xs text-[var(--text-secondary)]">{me.displayName} vs {player.displayName}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Journey Points</p>
                      <p className="mt-1 font-sora text-xl font-semibold text-[var(--text-primary)]">{formatSigned(comparison.journeyDelta)}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{player.trivia.points} vs {me.trivia.points}</p>
                    </article>
                    <article className="rounded-xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Battle Points</p>
                      <p className="mt-1 font-sora text-xl font-semibold text-[var(--text-primary)]">{formatSigned(comparison.battleDelta)}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{player.battle.points} vs {me.battle.points}</p>
                    </article>
                    <article className="rounded-xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Trivia Accuracy</p>
                      <p className="mt-1 font-sora text-xl font-semibold text-[var(--text-primary)]">{formatSigned(comparison.accuracyDelta, "%")}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{player.trivia.accuracy}% vs {me.trivia.accuracy}%</p>
                    </article>
                    <article className="rounded-xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Battle Win Rate</p>
                      <p className="mt-1 font-sora text-xl font-semibold text-[var(--text-primary)]">{formatSigned(comparison.winRateDelta, "%")}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{player.battle.winRate}% vs {me.battle.winRate}%</p>
                    </article>
                  </div>
                </section>
              ) : null}

              <section className="glass rounded-[22px] border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-slate-900/62">
                <h2 className="mb-3 inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                  <Award className="h-4 w-4 text-amber-500" /> Achievement Wall
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {player.achievements.progressItems.map((item) => {
                    const unlocked = item.progress >= item.goal;
                    const progress = Math.min(100, Math.round((item.progress / item.goal) * 100));
                    return (
                      <article key={item.id} className={`rounded-xl border px-3 py-3 ${unlocked ? "border-amber-300/50 bg-amber-500/14" : "border-black/8 bg-white/70 dark:border-white/10 dark:bg-white/5"}`}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{item.rarity}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">{item.description}</p>
                        <div className="mt-2 h-2 w-full rounded-full bg-black/10 dark:bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.progress}/{item.goal}</p>
                      </article>
                    );
                  })}
                </div>
              </section>

            </>
          ) : null}
        </div>
      </motion.main>
    </div>
  );
}

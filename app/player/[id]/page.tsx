"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftRight, BrainCircuit, Clock3, Swords, Trophy } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { fetchPublicPlayerCardByProfileKey, type PublicPlayerCardData } from "@/lib/supabase/playerCards";
import { getLocalProfileKey } from "@/lib/supabase/profileKey";

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const [player, setPlayer] = useState<PublicPlayerCardData | null>(null);
  const [me, setMe] = useState<PublicPlayerCardData | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const profileKey = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const myProfileKey = useMemo(() => getLocalProfileKey(), []);
  const isSelfProfile = profileKey === myProfileKey;

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
    if (isSelfProfile) return;

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

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Player Card" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-4">
          {isLoading ? (
            <section className="glass rounded-card border border-violet-400/20 p-6 text-sm text-[var(--text-secondary)]">
              Loading player card...
            </section>
          ) : null}

          {!isLoading && !player ? (
            <section className="glass rounded-card border border-violet-400/20 p-6">
              <p className="text-[var(--text-secondary)]">Player card not found for this profile key.</p>
              <Link href="/leaderboard" className="mt-3 inline-block text-sm text-violet-700 dark:text-violet-200">
                Back to Leaderboard
              </Link>
            </section>
          ) : null}

          {player ? (
            <>
              <section className="glass relative overflow-hidden rounded-[28px] border border-violet-400/25 bg-gradient-to-br from-white/82 via-white/70 to-cyan-100/45 p-6 shadow-[0_16px_52px_rgba(15,23,42,0.2)] dark:from-slate-900/75 dark:via-slate-900/58 dark:to-cyan-900/22">
                <div className="pointer-events-none absolute -left-14 top-6 h-44 w-44 rounded-full bg-fuchsia-500/16 blur-3xl" />
                <div className="pointer-events-none absolute -right-12 top-8 h-44 w-44 rounded-full bg-cyan-400/18 blur-3xl" />

                {!isSelfProfile ? (
                  <div className="relative mb-3 flex justify-end">
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
                  </div>
                ) : null}

                <div className="relative grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                  <article className="rounded-[24px] border border-violet-300/40 bg-white/65 p-4 dark:border-white/15 dark:bg-black/20">
                    <div className="grid place-items-center">
                      <span className="grid h-32 w-32 place-items-center rounded-full border-[3px] border-violet-300/70 bg-violet-500/20 text-4xl font-semibold text-violet-100 shadow-[0_0_0_3px_rgba(168,85,247,0.18),0_0_28px_rgba(167,139,250,0.45)]">
                        {player.avatar}
                      </span>
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

                    <div className="flex flex-wrap gap-2">
                      {player.tags.length ? (
                        player.tags.slice(0, 10).map((tag) => (
                          <span key={tag} className="rounded-full border border-violet-300/35 bg-violet-500/14 px-2.5 py-1 text-xs text-violet-700 dark:text-violet-100">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">No profile tags yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

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

              <section className="grid gap-4 lg:grid-cols-2">
                <article className="glass rounded-[22px] border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-slate-900/62">
                  <h2 className="mb-2 inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                    <Trophy className="h-4 w-4 text-violet-500" /> Recent Trivia Journey Sessions
                  </h2>
                  <div className="space-y-2">
                    {player.recentTrivia.length ? (
                      player.recentTrivia.slice(0, 8).map((entry, index) => (
                        <div key={`recent-trivia-${index}`} className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                          <p className="font-medium text-[var(--text-primary)]">{entry.category} • {entry.difficulty}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{entry.correct}/{entry.total} • {entry.points} pts</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)]">No Trivia Journey sessions yet.</p>
                    )}
                  </div>
                </article>

                <article className="glass rounded-[22px] border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-slate-900/62">
                  <h2 className="mb-2 inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                    <Clock3 className="h-4 w-4 text-cyan-500" /> Recent 1v1 Battles
                  </h2>
                  <div className="space-y-2">
                    {player.recentBattle.length ? (
                      player.recentBattle.slice(0, 8).map((entry, index) => (
                        <div key={`recent-battle-${index}`} className="rounded-xl border border-black/8 bg-white/65 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                          <p className="font-medium text-[var(--text-primary)]">{entry.mode} • vs {entry.opponent_name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{entry.category} • {entry.result.toUpperCase()} • {entry.user_score}-{entry.opponent_score}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)]">No 1v1 battle sessions yet.</p>
                    )}
                  </div>
                </article>
              </section>

              <div className="flex justify-end">
                <Link href="/leaderboard" className="focus-ring rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5">
                  Back to Leaderboard
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </motion.main>
    </div>
  );
}

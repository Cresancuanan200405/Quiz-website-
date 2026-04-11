"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Swords, Trophy } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import { useProfileStore } from "@/lib/profileStore";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { fetchBattleLeaderboard, type LeaderboardEntry, type LeaderboardWindow } from "@/lib/supabase/leaderboards";
import { getActiveProfileKey } from "@/lib/supabase/profileKey";

export default function BattleLeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardWindow>("global");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { battlesPlayed, wins, totalBattlePoints } = useBattleStatsStore();
  const { displayName } = useProfileStore();
  const { photo } = useProfilePhotoStore();
  const [myProfileKey, setMyProfileKey] = useState("local-player");

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      void (async () => {
        const profileKey = await getActiveProfileKey();
        setMyProfileKey(profileKey);
      })();
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, []);

  const displayAvatar = useMemo(() => {
    if (photo.type === "initials" && photo.value.trim()) return photo.value.trim().slice(0, 3).toUpperCase();
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((token) => token[0])
      .join("")
      .toUpperCase() || "ME";
  }, [displayName, photo.type, photo.value]);

  const battleWinRate = battlesPlayed > 0 ? Math.round((wins / battlesPlayed) * 100) : 0;
  const fallbackRows = useMemo<LeaderboardEntry[]>(
    () => [
      {
        id: myProfileKey,
        username: displayName,
        avatar: displayAvatar,
        avatarType: photo.type,
        avatarValue: photo.value,
        points: totalBattlePoints,
        rank: 1,
        rankLabel: totalBattlePoints >= 9800 ? "Legendary" : totalBattlePoints >= 8200 ? "Expert" : totalBattlePoints >= 6400 ? "Pro" : "Rising",
        accuracy: battleWinRate,
        activityCount: battlesPlayed,
      },
    ],
    [battleWinRate, battlesPlayed, displayAvatar, displayName, myProfileKey, photo.type, photo.value, totalBattlePoints]
  );

  const loadRows = useCallback(async (windowName: LeaderboardWindow) => {
    setIsLoading(true);
    const remote = await fetchBattleLeaderboard(windowName);
    setRows(remote.length ? remote : fallbackRows);
    setIsLoading(false);
  }, [fallbackRows]);

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      void loadRows(activeTab);
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, [activeTab, loadRows]);

  const topPlayer = rows[0] ?? null;

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="1v1 Battle Leaderboard" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <section className="glass relative overflow-hidden rounded-[28px] border border-cyan-400/25 bg-gradient-to-br from-white/80 via-white/68 to-cyan-100/40 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] dark:from-slate-900/74 dark:via-slate-900/56 dark:to-cyan-900/22">
            <div className="pointer-events-none absolute -left-16 top-6 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 top-10 h-52 w-52 rounded-full bg-violet-500/16 blur-3xl" />

            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/12 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                  <Swords className="h-3.5 w-3.5" /> Competitive Arena
                </p>
                <h1 className="mt-2 font-sora text-3xl font-bold text-[var(--text-primary)]">1v1 Battle Rankings</h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Live standings based on the same battle points engine used by dashboard previews.</p>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/battle" className="focus-ring rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5">
                  <ArrowLeft className="mr-1 inline h-4 w-4" /> Back to Battle
                </Link>
                <button
                  type="button"
                  onClick={() => void loadRows(activeTab)}
                  className="focus-ring rounded-full border border-cyan-400/35 bg-cyan-500/12 px-3 py-1.5 text-sm text-cyan-700 dark:text-cyan-200"
                >
                  <RefreshCw className="mr-1 inline h-4 w-4" /> Refresh
                </button>
              </div>
            </div>

            <div className="relative mt-4 inline-flex rounded-full border border-black/10 bg-white/65 p-1 dark:border-white/10 dark:bg-white/5">
              {(["global", "daily", "weekly"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`focus-ring rounded-full px-4 py-1.5 text-sm capitalize ${
                    activeTab === tab ? "bg-cyan-500/25 text-cyan-700 dark:text-cyan-100" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {topPlayer ? (
              <div className="relative mt-4 grid gap-2 rounded-2xl border border-amber-300/35 bg-amber-500/10 p-3 text-sm sm:grid-cols-3">
                <p className="text-[var(--text-secondary)]">Top Challenger: <span className="font-semibold text-[var(--text-primary)]">{topPlayer.username}</span></p>
                <p className="text-[var(--text-secondary)]">Points: <span className="font-semibold text-[var(--text-primary)]">{topPlayer.points}</span></p>
                <p className="text-[var(--text-secondary)]">Rank Label: <span className="font-semibold text-[var(--text-primary)]">{topPlayer.rankLabel}</span></p>
              </div>
            ) : null}
          </section>

          <section className="glass rounded-[24px] border border-black/10 bg-white/75 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-slate-900/64">
            <div className="mb-2 grid grid-cols-[64px_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_110px] gap-2 px-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <span>Rank</span>
              <span>Player</span>
              <span>Battle Points</span>
              <span>Win Rate</span>
              <span>Tier</span>
            </div>

            <div className="space-y-2">
              {rows.map((row) => (
                <Link
                  key={`battle-board-${row.id}`}
                  href={`/player/${encodeURIComponent(row.id)}`}
                  className="focus-ring block rounded-xl"
                >
                  <article className="grid grid-cols-[64px_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_110px] items-center gap-2 rounded-xl border border-black/8 bg-white/60 px-2 py-2 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <div className="inline-flex items-center gap-2">
                      <span className="font-sora text-lg font-semibold text-[var(--text-primary)]">#{row.rank}</span>
                      {row.rank === 1 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">{row.username}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{row.activityCount} battles</p>
                    </div>

                    <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">{row.points}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{row.accuracy}%</p>
                    <span className="inline-flex justify-center rounded-full border border-cyan-300/45 bg-cyan-500/12 px-2 py-0.5 text-xs text-cyan-700 dark:text-cyan-100">{row.rankLabel}</span>
                  </article>
                </Link>
              ))}

              {isLoading ? <p className="px-2 text-xs text-[var(--text-secondary)]">Loading live battle rankings...</p> : null}
              {!isLoading && rows.length === 0 ? <p className="px-2 text-xs text-[var(--text-secondary)]">No battle ranking data yet. Finish some 1v1 matches to populate this board.</p> : null}
            </div>
          </section>
        </div>
      </motion.main>
    </div>
  );
}

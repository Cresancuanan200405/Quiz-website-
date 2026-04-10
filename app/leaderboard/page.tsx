"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Swords } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import LeaderboardRow from "@/components/LeaderboardRow";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { useProfileStore } from "@/lib/profileStore";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { fetchBattleLeaderboard, fetchTriviaJourneyLeaderboard, type LeaderboardWindow } from "@/lib/supabase/leaderboards";
import { getActiveProfileKey } from "@/lib/supabase/profileKey";
import type { BoardTab } from "@/lib/types";
import type { LeaderboardUser } from "@/lib/types";

const tabs: BoardTab[] = ["global", "daily", "weekly"];
type LeaderboardMode = "trivia" | "battle";

const toLeaderboardUser = (entry: {
  id: string;
  username: string;
  avatar: string;
  points: number;
  rank: number;
  rankLabel: string;
  accuracy: number;
  activityCount: number;
}): LeaderboardUser => ({
  id: entry.id,
  username: entry.username,
  avatar: entry.avatar,
  score: entry.points,
  accuracy: entry.accuracy,
  quizCount: entry.activityCount,
  rank: entry.rank,
  tier: (entry.rankLabel === "Legendary" || entry.rankLabel === "Expert" || entry.rankLabel === "Pro" ? entry.rankLabel : "Rising") as LeaderboardUser["tier"],
});

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<BoardTab>("global");
  const [mode, setMode] = useState<LeaderboardMode>("trivia");
  const [rows, setRows] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, totalPoints } = usePlayerStatsStore();
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
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "ME";
  }, [displayName, photo.type, photo.value]);

  const triviaAccuracy = totalAnsweredQuestions > 0 ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 100) : 0;
  const fallbackTriviaRows = useMemo<LeaderboardUser[]>(
    () => [
      {
        id: myProfileKey,
        username: displayName,
        avatar: displayAvatar,
        score: totalPoints,
        accuracy: triviaAccuracy,
        quizCount: quizzesCompleted,
        rank: 1,
        tier: totalPoints >= 16000 ? "Legendary" : totalPoints >= 14500 ? "Expert" : totalPoints >= 12500 ? "Pro" : "Rising",
      },
    ],
    [displayAvatar, displayName, myProfileKey, quizzesCompleted, totalPoints, triviaAccuracy]
  );

  const battleWinRate = battlesPlayed > 0 ? Math.round((wins / battlesPlayed) * 100) : 0;
  const fallbackBattleRows = useMemo<LeaderboardUser[]>(
    () => [
      {
        id: myProfileKey,
        username: displayName,
        avatar: displayAvatar,
        score: totalBattlePoints,
        accuracy: battleWinRate,
        quizCount: battlesPlayed,
        rank: 1,
        tier: totalBattlePoints >= 9800 ? "Legendary" : totalBattlePoints >= 8200 ? "Expert" : totalBattlePoints >= 6400 ? "Pro" : "Rising",
      },
    ],
    [battleWinRate, battlesPlayed, displayAvatar, displayName, myProfileKey, totalBattlePoints]
  );

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      setIsLoading(true);

      void (async () => {
        const windowName = activeTab as LeaderboardWindow;
        if (mode === "trivia") {
          const remote = await fetchTriviaJourneyLeaderboard(windowName);
          setRows(remote.length ? remote.map(toLeaderboardUser) : fallbackTriviaRows);
        } else {
          const remote = await fetchBattleLeaderboard(windowName);
          setRows(remote.length ? remote.map(toLeaderboardUser) : fallbackBattleRows);
        }

        setIsLoading(false);
      })();
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, [activeTab, fallbackBattleRows, fallbackTriviaRows, mode]);

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Leaderboard" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl">
          <section className="glass mb-6 rounded-card p-5">
            <h1 className="font-sora text-2xl font-bold text-[var(--text-primary)]">Top Players</h1>
            <p className="text-sm text-[var(--text-secondary)]">Switch between Trivia Journey and 1v1 Battle to view real-time ranked ladders.</p>

            <div className="mt-4 inline-flex rounded-full border border-black/8 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setMode("trivia")}
                className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${mode === "trivia" ? "bg-violet-500/25 text-violet-700 dark:text-violet-100" : "text-[var(--text-secondary)]"}`}
              >
                <BrainCircuit className="h-4 w-4" /> Trivia Journey
              </button>
              <button
                type="button"
                onClick={() => setMode("battle")}
                className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${mode === "battle" ? "bg-cyan-500/25 text-cyan-700 dark:text-cyan-100" : "text-[var(--text-secondary)]"}`}
              >
                <Swords className="h-4 w-4" /> 1v1 Battle
              </button>
            </div>
          </section>

          <div className="mb-5 flex w-full max-w-md rounded-full border border-black/8 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-label={`Switch to ${tab} leaderboard`}
                onClick={() => setActiveTab(tab)}
                className="focus-ring relative flex-1 rounded-full px-3 py-2 text-sm capitalize text-[var(--text-secondary)]"
              >
                {activeTab === tab ? (
                  <motion.span
                    layoutId="tab-indicator"
                    className={`absolute inset-0 rounded-full ${mode === "battle" ? "bg-cyan-500/30" : "bg-violet-500/30"}`}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                ) : null}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>

          <div className="mb-2 hidden grid-cols-[70px_1.3fr_1fr_140px_120px] gap-3 px-4 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] md:grid">
            <span>Rank</span>
            <span>Player</span>
            <span>{mode === "battle" ? "Battle Points" : "Journey Points"}</span>
            <span>{mode === "battle" ? "Win Rate" : "Accuracy"}</span>
            <span>Tier</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${activeTab}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              {rows.slice(0, 20).map((user, index) => (
                <LeaderboardRow
                  key={`${mode}-${activeTab}-${user.id}`}
                  user={user}
                  href={`/player/${encodeURIComponent(user.id)}`}
                  highlight={user.id === myProfileKey}
                  index={index}
                  activityLabel={mode === "battle" ? "battles" : "journeys"}
                />
              ))}
              {isLoading ? <p className="px-2 text-xs text-[var(--text-secondary)]">Loading live leaderboard...</p> : null}
              {!isLoading && rows.length === 0 ? (
                <p className="px-2 text-xs text-[var(--text-secondary)]">No leaderboard records yet for this mode and window.</p>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
    </div>
  );
}

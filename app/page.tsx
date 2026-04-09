"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Crown, Flame, Shield, ShieldCheck, Swords, Target, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CategoryCard from "@/components/CategoryCard";
import FactCard from "@/components/FactCard";
import StatCard from "@/components/StatCard";
import CategoryPreviewModal from "@/components/CategoryPreviewModal";
import { categoryMeta, currentUser, onlinePlayers } from "@/lib/mockData";
import { buildAchievementProgress, getUnlockedAchievements } from "@/lib/achievements";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import { useProfileStore } from "@/lib/profileStore";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { fetchBattleLeaderboard, fetchTriviaJourneyLeaderboard, type LeaderboardEntry, type LeaderboardWindow } from "@/lib/supabase/leaderboards";
import { getLocalProfileKey } from "@/lib/supabase/profileKey";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryMeta)[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayShowAllCategories, setDisplayShowAllCategories] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<"trivia" | "battle">("trivia");
  const [previewTab, setPreviewTab] = useState<LeaderboardWindow>("global");
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [now] = useState(() => Date.now());
  const { quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, totalPoints, bestStreak, quizHistory } = usePlayerStatsStore();
  const { battlesPlayed, wins, totalBattlePoints, bestWinStreak } = useBattleStatsStore();
  const { displayName } = useProfileStore();
  const { photo } = useProfilePhotoStore();
  const [myProfileKey, setMyProfileKey] = useState("local-player");

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      setMyProfileKey(getLocalProfileKey());
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, []);

  const dashboardAccuracy = totalAnsweredQuestions > 0 ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 100) : 0;
  const dashboardQuizzes = quizzesCompleted;
  const dashboardStreak = bestStreak;
  const weeklyStats = useMemo(() => {
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentQuizzes = quizHistory.filter((entry) => new Date(entry.completedAt).getTime() >= weekAgo);
    const weeklyPoints = recentQuizzes.reduce((sum, entry) => sum + entry.points, 0);
    const weeklyQuizzes = recentQuizzes.length;
    const weeklyTargetPoints = Math.max(500, currentUser.weeklyGoal * 10);
    const weeklyGoalProgress = Math.min(100, Math.round((weeklyPoints / weeklyTargetPoints) * 100));

    return {
      weeklyPoints,
      weeklyQuizzes,
      weeklyTargetPoints,
      weeklyGoalProgress,
    };
  }, [now, quizHistory]);
  const hasNoQuizRecords = dashboardAccuracy === 0 && dashboardStreak === 0 && dashboardQuizzes === 0;
  const dashboardAvatar = useMemo(() => {
    if (photo.type === "initials" && photo.value.trim()) return photo.value.trim().slice(0, 3).toUpperCase();
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "ME";
  }, [displayName, photo.type, photo.value]);

  const fallbackTriviaPreviewRows = useMemo<LeaderboardEntry[]>(
    () => [
      {
        id: myProfileKey,
        username: displayName,
        avatar: dashboardAvatar,
        points: totalPoints,
        rank: 1,
        rankLabel: totalPoints >= 16000 ? "Legendary" : totalPoints >= 14500 ? "Expert" : totalPoints >= 12500 ? "Pro" : "Rising",
        accuracy: dashboardAccuracy,
        activityCount: quizzesCompleted,
      },
    ],
    [dashboardAccuracy, dashboardAvatar, displayName, myProfileKey, quizzesCompleted, totalPoints]
  );

  const battleWinRate = battlesPlayed > 0 ? Math.round((wins / battlesPlayed) * 100) : 0;
  const fallbackBattlePreviewRows = useMemo<LeaderboardEntry[]>(
    () => [
      {
        id: myProfileKey,
        username: displayName,
        avatar: dashboardAvatar,
        points: totalBattlePoints,
        rank: 1,
        rankLabel: totalBattlePoints >= 9800 ? "Legendary" : totalBattlePoints >= 8200 ? "Expert" : totalBattlePoints >= 6400 ? "Pro" : "Rising",
        accuracy: battleWinRate,
        activityCount: battlesPlayed,
      },
    ],
    [battleWinRate, battlesPlayed, dashboardAvatar, displayName, myProfileKey, totalBattlePoints]
  );

  const [triviaPreviewRows, setTriviaPreviewRows] = useState<LeaderboardEntry[]>(fallbackTriviaPreviewRows);
  const [battlePreviewRows, setBattlePreviewRows] = useState<LeaderboardEntry[]>(fallbackBattlePreviewRows);

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      setIsRankingLoading(true);

      void (async () => {
        const [remoteTrivia, remoteBattle] = await Promise.all([
          fetchTriviaJourneyLeaderboard(previewTab),
          fetchBattleLeaderboard(previewTab),
        ]);

        setTriviaPreviewRows(remoteTrivia.length ? remoteTrivia.slice(0, 5) : fallbackTriviaPreviewRows);
        setBattlePreviewRows(remoteBattle.length ? remoteBattle.slice(0, 5) : fallbackBattlePreviewRows);
        setIsRankingLoading(false);
      })();
    }, 0);

    return () => window.clearTimeout(kickoff);
  }, [fallbackBattlePreviewRows, fallbackTriviaPreviewRows, previewTab]);

  const currentTriviaRank = triviaPreviewRows.find((row) => row.id === myProfileKey)?.rank ?? null;
  const activePreviewRows = leaderboardMode === "trivia" ? triviaPreviewRows : battlePreviewRows;

  const unlockedAchievements = useMemo(
    () =>
      getUnlockedAchievements(
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
        })
      ),
    [battlesPlayed, bestStreak, bestWinStreak, quizzesCompleted, quizHistory, totalBattlePoints, totalCorrectAnswers, totalPoints, wins]
  );

  const achievementIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "first-journey": Award,
    "journey-hundred": Target,
    "streak-master": Flame,
    "points-collector": Trophy,
    "battle-initiate": Swords,
    "battle-victor": Crown,
    "battle-hotstreak": Shield,
    "battle-points": Award,
    "category-mastery": Crown,
  };

  const rarityTone: Record<string, string> = {
    Common: "border-slate-300/45 bg-slate-500/12 text-slate-700 dark:text-slate-200",
    Rare: "border-cyan-300/45 bg-cyan-500/14 text-cyan-700 dark:text-cyan-100",
    Epic: "border-violet-300/45 bg-violet-500/14 text-violet-700 dark:text-violet-100",
    Legendary: "border-amber-300/45 bg-amber-500/16 text-amber-700 dark:text-amber-100",
  };

  return (
    <div className="min-h-screen pb-20 dark:bg-[#0A0B14] bg-[#F8F7FF] md:pb-0">
      <Sidebar />
      <TopBar title="Dashboard" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <section className="relative overflow-hidden rounded-card border border-black/10 bg-white/70 p-6 shadow-[0_16px_42px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_56px_rgba(2,8,32,0.5)]">
            <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl dark:bg-violet-500/30" />
            <div className="pointer-events-none absolute -bottom-24 left-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl dark:bg-blue-500/25" />

            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div className="max-w-2xl">
                <p className="mb-1 text-sm text-violet-700 dark:text-violet-200">Welcome back {displayName}</p>
                <h1 className="font-sora text-3xl font-bold text-slate-900 sm:text-5xl dark:text-white">Ready for another streak?</h1>
                <p className="mt-3 text-base text-slate-700 sm:text-lg dark:text-white/65">
                  You&apos;re just 420 points away from breaking into top 5. Keep answering fast to climb.
                </p>
              </div>
              <Link
                href="/quiz?instant=1"
                className="focus-ring inline-flex items-center gap-2 rounded-2xl border border-violet-400/35 bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-4 text-xl font-semibold text-white shadow-[0_16px_34px_rgba(124,58,237,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(124,58,237,0.45)]"
                aria-label="Start an instant quiz"
              >
                Start Instant Quiz <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
              <span className="rounded-full border border-green-400/35 bg-green-500/10 px-3 py-1 text-sm text-green-700 dark:text-green-200">
                Accuracy {dashboardAccuracy}%
              </span>
              <span className="rounded-full border border-blue-400/35 bg-blue-500/10 px-3 py-1 text-sm text-blue-700 dark:text-blue-200">
                Quizzes {dashboardQuizzes}
              </span>
              <span className="rounded-full border border-violet-400/35 bg-violet-500/10 px-3 py-1 text-sm text-violet-700 dark:text-violet-200">
                Rank {currentTriviaRank ? `#${currentTriviaRank}` : "--"}
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categoryMeta.slice(0, 4).map((category) => (
                <CategoryCard
                  key={category.name}
                  iconName={category.iconName}
                  name={category.name}
                  difficulty={category.difficulty}
                  color={category.color}
                  active={selectedCategory?.name === category.name}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsModalOpen(true);
                  }}
                  hideDifficulty={true}
                />
              ))}
            </div>

            <AnimatePresence initial={false} mode="wait">
              {displayShowAllCategories ? (
                <motion.div
                  key="expanded-categories"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="grid gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-4"
                >
                  {categoryMeta.slice(4, 8).map((category) => (
                    <CategoryCard
                      key={category.name}
                      iconName={category.iconName}
                      name={category.name}
                      difficulty={category.difficulty}
                      color={category.color}
                      active={selectedCategory?.name === category.name}
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsModalOpen(true);
                      }}
                      hideDifficulty={true}
                    />
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDisplayShowAllCategories((value) => !value)}
                className="focus-ring text-sm font-medium text-violet-700 transition-colors duration-150 hover:text-violet-600 dark:text-violet-200 dark:hover:text-violet-100"
              >
                {displayShowAllCategories ? "Show Less Categories" : "View All Categories"}
              </button>
            </div>
          </section>

          <section className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Accuracy" value={`${dashboardAccuracy}%`} tone="green" icon={<ShieldCheck className="h-4 w-4" />} />
              <StatCard label="Streak" value={`${dashboardStreak}`} tone="amber" icon={<Trophy className="h-4 w-4" />} />
              <StatCard label="Quizzes" value={`${dashboardQuizzes}`} tone="blue" icon={<ArrowRight className="h-4 w-4" />} />
            </div>
            {hasNoQuizRecords ? (
              <p className="text-xs text-[var(--text-secondary)]">No quiz records yet. Play a quiz to populate your dashboard stats.</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="glass rounded-card border border-black/10 bg-gradient-to-br from-white/78 via-white/60 to-cyan-100/25 p-4 shadow-[0_16px_28px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/70 dark:via-slate-900/50 dark:to-cyan-900/18 dark:shadow-[0_18px_32px_rgba(2,8,25,0.4)]">
                <div className="mb-2 flex items-center justify-between text-sm dark:text-white/70 text-gray-600">
                  <p>Weekly Goal</p>
                  <p>{weeklyStats.weeklyGoalProgress}%</p>
                </div>
                <div className="h-3 overflow-hidden rounded-full dark:bg-white/10 bg-black/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${weeklyStats.weeklyGoalProgress}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-green-400"
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {weeklyStats.weeklyPoints} / {weeklyStats.weeklyTargetPoints} points this week
                </p>
              </div>

              <div className="glass rounded-card border border-black/10 bg-gradient-to-br from-white/78 via-white/60 to-fuchsia-100/25 p-4 shadow-[0_16px_28px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/70 dark:via-slate-900/50 dark:to-fuchsia-900/18 dark:shadow-[0_18px_32px_rgba(2,8,25,0.4)]">
                <div className="mb-2 flex items-center justify-between text-sm dark:text-white/70 text-gray-600">
                  <p>Weekly Activity</p>
                  <p>{weeklyStats.weeklyQuizzes} quizzes</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-card border border-black/8 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Points</p>
                    <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{weeklyStats.weeklyPoints}</p>
                  </div>
                  <div className="rounded-card border border-black/8 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">Quizzes</p>
                    <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{weeklyStats.weeklyQuizzes}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <article className="glass rounded-card border border-black/10 bg-gradient-to-br from-white/80 via-white/60 to-violet-100/30 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_36px_rgba(99,102,241,0.2)] dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/72 dark:via-slate-900/52 dark:to-violet-900/22 dark:shadow-[0_18px_36px_rgba(2,8,25,0.42)]">
            <p className="mb-4 font-sora text-lg font-semibold dark:text-white text-gray-900">1v1 Quick Start</p>
            <div className="mb-4 grid grid-cols-3 items-center text-center">
              <div className="grid place-items-center gap-2">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-500/20 font-semibold text-violet-700 dark:text-violet-200">
                  {currentUser.avatar}
                </span>
                <span className="text-xs dark:text-white/70 text-gray-600">You</span>
              </div>
              <span className="font-sora text-2xl font-bold text-violet-700 dark:text-violet-300">VS</span>
              <div className="grid place-items-center gap-2">
                <span className="grid h-12 w-12 place-items-center rounded-full dark:bg-white/10 bg-black/5 font-semibold dark:text-white/70 text-gray-600">?</span>
                <span className="text-xs dark:text-white/70 text-gray-600">Opponent</span>
              </div>
            </div>
            <p className="mb-4 text-sm dark:text-white/70 text-gray-600">{onlinePlayers.toLocaleString()} players online now.</p>
            <Link
              href="/battle"
              className="focus-ring arcade-btn btn-success inline-flex items-center gap-2 rounded-button px-4 py-2 text-sm font-medium"
            >
              <Swords className="h-4 w-4" /> Find Opponent
            </Link>
          </article>
        </section>

          {unlockedAchievements.length ? (
            <section className="glass rounded-[20px] border border-violet-300/25 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-900/58">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Unlocked Achievement Badges</p>
                <Link href="/achievements" className="text-xs text-violet-700 hover:text-violet-600 dark:text-violet-200">View achievements</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlockedAchievements.slice(0, 8).map((item) => (
                  <motion.div
                    key={`badge-${item.id}`}
                    title={`${item.title} (${item.rarity})`}
                    whileHover={{ y: -2, scale: 1.06, rotateX: 8, rotateY: -6 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                    className={`group relative grid h-9 w-9 place-items-center rounded-xl border [transform:perspective(600px)] ${rarityTone[item.rarity] ?? rarityTone.Common} shadow-[0_8px_14px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.42)]`}
                  >
                    <span className="pointer-events-none absolute left-1 top-1 h-2.5 w-5 rounded-full bg-white/35 blur-[2px]" />
                    {(() => {
                      const Icon = achievementIconMap[item.id] ?? Award;
                      return <Icon className="relative z-10 h-4 w-4 drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]" />;
                    })()}
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-xl"
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ boxShadow: "0 0 12px rgba(99,102,241,0.35)" }}
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid items-start gap-4 lg:grid-cols-3">
            <article className={`glass rounded-card border border-black/10 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 dark:border-white/10 dark:shadow-[0_18px_36px_rgba(2,8,25,0.42)] ${
              leaderboardMode === "battle"
                ? "bg-gradient-to-br from-white/80 via-white/60 to-cyan-100/30 hover:shadow-[0_22px_36px_rgba(34,211,238,0.18)] dark:bg-gradient-to-br dark:from-slate-900/72 dark:via-slate-900/52 dark:to-cyan-900/22"
                : "bg-gradient-to-br from-white/80 via-white/60 to-indigo-100/28 hover:shadow-[0_22px_36px_rgba(79,70,229,0.18)] dark:bg-gradient-to-br dark:from-slate-900/72 dark:via-slate-900/52 dark:to-indigo-900/22"
            } lg:col-span-2`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-sora text-lg font-semibold dark:text-white text-gray-900">
                    {leaderboardMode === "battle" ? "1v1 Battle Preview" : "Trivia Journey Preview"}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {leaderboardMode === "battle" ? "Ranked by battle points" : "Ranked by journey points"}
                  </p>
                </div>
                <div className="inline-flex rounded-full border border-black/10 bg-white/65 p-1 text-xs dark:border-white/10 dark:bg-white/5">
                  <button
                    type="button"
                    onClick={() => setLeaderboardMode("trivia")}
                    className={`focus-ring rounded-full px-3 py-1 ${leaderboardMode === "trivia" ? "bg-violet-500/25 text-violet-700 dark:text-violet-100" : "text-[var(--text-secondary)]"}`}
                  >
                    Trivia Journey
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardMode("battle")}
                    className={`focus-ring rounded-full px-3 py-1 ${leaderboardMode === "battle" ? "bg-cyan-500/25 text-cyan-700 dark:text-cyan-100" : "text-[var(--text-secondary)]"}`}
                  >
                    1v1 Battle
                  </button>
                </div>
              </div>

              <div className="mb-3 inline-flex rounded-full border border-black/10 bg-white/65 p-1 text-xs dark:border-white/10 dark:bg-white/5">
                {(["global", "daily", "weekly"] as const).map((tab) => (
                  <button
                    key={`preview-tab-${tab}`}
                    type="button"
                    onClick={() => setPreviewTab(tab)}
                    className={`focus-ring rounded-full px-3 py-1 capitalize ${previewTab === tab ? (leaderboardMode === "battle" ? "bg-cyan-500/25 text-cyan-700 dark:text-cyan-100" : "bg-violet-500/25 text-violet-700 dark:text-violet-100") : "text-[var(--text-secondary)]"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {activePreviewRows.map((row) => (
                  <Link
                    key={`active-preview-${leaderboardMode}-${row.id}`}
                    href={`/player/${encodeURIComponent(row.id)}`}
                    className="focus-ring block rounded-xl"
                  >
                  <div
                    className={`grid grid-cols-[44px_minmax(0,1fr)_86px] items-center gap-2 rounded-xl border px-2.5 py-2 ${
                      row.id === myProfileKey
                        ? leaderboardMode === "battle"
                          ? "border-cyan-400/35 bg-cyan-500/10"
                          : "border-violet-400/35 bg-violet-500/10"
                        : "border-black/8 bg-white/55 dark:border-white/10 dark:bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)]">#{row.rank}</p>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{row.username}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {row.activityCount} {leaderboardMode === "battle" ? "battles" : "journeys"} · {row.accuracy}% {leaderboardMode === "battle" ? "win" : "acc"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{row.points}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{row.rankLabel}</p>
                    </div>
                  </div>
                  </Link>
                ))}
                {isRankingLoading ? <p className="text-xs text-[var(--text-secondary)]">Loading live rankings...</p> : null}
              </div>

              <div className="mt-3 text-right">
                <Link
                  href={leaderboardMode === "battle" ? "/battle/leaderboard" : "/leaderboard"}
                  className={`text-sm ${leaderboardMode === "battle" ? "text-cyan-700 hover:text-cyan-600 dark:text-cyan-200 dark:hover:text-cyan-100" : "text-violet-700 hover:text-violet-600 dark:text-violet-200 dark:hover:text-violet-100"}`}
                >
                  {leaderboardMode === "battle" ? "Open Full Battle Board" : "See all"}
                </Link>
              </div>
            </article>

            <FactCard dynamic featured />
          </section>
        </div>
      </motion.main>

      <CategoryPreviewModal
        isOpen={isModalOpen}
        category={selectedCategory}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        onCategoryChange={(category) => {
          setSelectedCategory(category);
        }}
      />
    </div>
  );
}

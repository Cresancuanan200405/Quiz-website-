"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star, PenSquare, Camera, Check, X, BrainCircuit, Swords, Award, Crown, Flame, Shield, Target, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ProfilePhoto from "@/components/ProfilePhoto";
import ProfilePhotoModal from "@/components/ProfilePhotoModal";
import { triviaFacts } from "@/lib/mockData";
import { buildAchievementProgress, getUnlockedAchievements, type AchievementRarity } from "@/lib/achievements";
import { useNotificationStore } from "@/lib/notificationStore";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { MAX_PROFILE_TAGS, useProfileStore } from "@/lib/profileStore";
import { useSettingsStore } from "@/lib/settingsStore";
import { persistProfileToSupabase } from "@/lib/supabase/profilePersistence";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { useTriviaFactsStore } from "@/lib/triviaFactsStore";
import { useBattleStatsStore } from "@/lib/battleStatsStore";
import type { ProfileTab } from "@/lib/types";
import { cx } from "@/lib/utils";

const tabs: ProfileTab[] = ["stats", "history", "saved"];

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

const ratingToRank = (rating: number) => {
  if (rating >= 94) return "Grandmaster";
  if (rating >= 86) return "Master";
  if (rating >= 76) return "Diamond";
  if (rating >= 64) return "Platinum";
  if (rating >= 52) return "Gold";
  if (rating >= 40) return "Silver";
  return "Bronze";
};

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const { displayName, handle, bio, tags, tier, setProfile } = useProfileStore();
  const { pushNotification } = useNotificationStore();
  const { photo } = useProfilePhotoStore();
  const { showOnlineStatus } = useSettingsStore();
  const { quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, bestStreak, totalPoints, quizHistory } = usePlayerStatsStore();
  const { battlesPlayed, wins, losses, draws, totalScoreFor, totalScoreAgainst, bestWinStreak, totalBattlePoints, battleHistory } = useBattleStatsStore();
  const { savedFactIds, factSnapshots, toggleSave } = useTriviaFactsStore();
  const [editData, setEditData] = useState({
    displayName,
    handle,
    bio,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTriviaHistoryExpanded, setIsTriviaHistoryExpanded] = useState(true);
  const [isBattleHistoryExpanded, setIsBattleHistoryExpanded] = useState(true);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "stats" || tab === "history" || tab === "saved") {
      setActiveTab(tab);
    }

    const section = searchParams.get("section");
    if (section === "trivia") {
      setActiveTab("history");
      setIsTriviaHistoryExpanded(true);
      setIsBattleHistoryExpanded(false);
    } else if (section === "battle") {
      setActiveTab("history");
      setIsTriviaHistoryExpanded(false);
      setIsBattleHistoryExpanded(true);
    }
  }, [searchParams]);

  const savedFacts = useMemo(() => {
    const staticFacts = triviaFacts.filter((fact) => savedFactIds.includes(fact.id));
    const staticIds = new Set(staticFacts.map((fact) => fact.id));
    const dynamicFacts = savedFactIds
      .filter((id) => !staticIds.has(id))
      .map((id) => factSnapshots[id])
      .filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));

    return [...dynamicFacts, ...staticFacts];
  }, [factSnapshots, savedFactIds]);

  const accuracy = totalAnsweredQuestions > 0 ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 100) : 0;

  const battleSummary = useMemo(() => {
    const total = battlesPlayed;
    const totalUserScore = totalScoreFor;
    const totalOpponentScore = totalScoreAgainst;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const scoreDiffPerMatch = total > 0 ? (totalUserScore - totalOpponentScore) / total : 0;

    return {
      total,
      wins,
      losses,
      draws,
      winRate,
      scoreDiffPerMatch,
      totalUserScore,
      totalOpponentScore,
    };
  }, [battlesPlayed, draws, losses, totalScoreAgainst, totalScoreFor, wins]);

  const triviaAvgPoints = quizzesCompleted > 0 ? Math.round(totalPoints / quizzesCompleted) : 0;
  const triviaPowerRating = Math.round(Math.min(99, accuracy * 0.55 + Math.min(35, bestStreak * 2) + Math.min(20, quizzesCompleted * 0.8)));
  const triviaSpeedRating = Math.round(Math.min(99, accuracy * 0.65 + Math.min(30, triviaAvgPoints / 22)));
  const triviaConsistencyRating = Math.round(Math.min(99, Math.min(55, quizzesCompleted * 2) + Math.min(44, bestStreak * 3.5)));

  const battlePowerRating = Math.round(Math.min(99, battleSummary.winRate * 0.7 + Math.min(29, battleSummary.wins * 2.5)));
  const battleClutchRating = Math.round(Math.min(99, Math.max(0, 52 + battleSummary.scoreDiffPerMatch * 7 + battleSummary.winRate * 0.35)));
  const battleConsistencyRating = Math.round(Math.min(99, Math.min(60, battleSummary.total * 1.8) + Math.min(36, battleSummary.winRate * 0.45)));

  const triviaRankings = [
    { label: "Journey Power", rank: ratingToRank(triviaPowerRating), rating: triviaPowerRating },
    { label: "Journey Precision", rank: ratingToRank(triviaSpeedRating), rating: triviaSpeedRating },
    { label: "Journey Consistency", rank: ratingToRank(triviaConsistencyRating), rating: triviaConsistencyRating },
  ];

  const battleRankings = [
    { label: "Battle Power", rank: ratingToRank(battlePowerRating), rating: battlePowerRating },
    { label: "Battle Clutch", rank: ratingToRank(battleClutchRating), rating: battleClutchRating },
    { label: "Battle Consistency", rank: ratingToRank(battleConsistencyRating), rating: battleConsistencyRating },
  ];

  const pointsGoal = Math.max(1000, Math.ceil((totalPoints + 500) / 1000) * 1000);
  const pointsProgress = totalPoints > 0 ? Math.max(8, Math.min(100, Math.round((totalPoints / pointsGoal) * 100))) : 8;
  const battlePointsGoal = Math.max(1000, Math.ceil((totalBattlePoints + 500) / 1000) * 1000);
  const battlePointsProgress = totalBattlePoints > 0 ? Math.max(8, Math.min(100, Math.round((totalBattlePoints / battlePointsGoal) * 100))) : 8;
  const battleTier = totalBattlePoints >= 9800 ? "Legendary" : totalBattlePoints >= 8200 ? "Expert" : totalBattlePoints >= 6400 ? "Pro" : "Rising";

  const achievementIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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

  const achievementRarityClass: Record<AchievementRarity, string> = {
    Common: "border-slate-300/45 bg-slate-500/12 text-slate-700 dark:text-slate-200",
    Rare: "border-cyan-300/45 bg-cyan-500/14 text-cyan-700 dark:text-cyan-100",
    Epic: "border-violet-300/45 bg-violet-500/14 text-violet-700 dark:text-violet-100",
    Legendary: "border-amber-300/45 bg-amber-500/16 text-amber-700 dark:text-amber-100",
  };

  const achievementProgress = buildAchievementProgress({
    quizzesCompleted,
    totalCorrectAnswers,
    bestStreak,
    totalPoints,
    battlesPlayed,
    wins,
    bestWinStreak,
    totalBattlePoints,
    quizHistory,
  });

  const unlockedAchievementIds = new Set(getUnlockedAchievements(achievementProgress).map((item) => item.id));

  const achievementWallItems = achievementProgress
    .map((item) => ({
      ...item,
      icon: achievementIconMap[item.id] ?? Award,
      unlocked: unlockedAchievementIds.has(item.id),
    }))
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      const rarityRank: Record<AchievementRarity, number> = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
      return rarityRank[b.rarity] - rarityRank[a.rarity];
    });

  const unlockedAchievementItems = achievementWallItems.filter((item) => item.unlocked);
  const unlockedAchievementCount = unlockedAchievementItems.length;

  const groupedProfileTags = useMemo(() => {
    const visibleTags = new Set(isEditing ? selectedTags : tags);

    return Object.entries(profileTagLibrary).map(([title, options]) => ({
      title,
      tags: options.filter((tag) => visibleTags.has(tag)),
    }));
  }, [isEditing, selectedTags, tags]);

  const validateUsername = (value: string) => {
    const newErrors = { ...errors };
    if (!value.trim()) {
      newErrors.handle = "Username cannot be empty";
    } else if (value.includes(" ")) {
      newErrors.handle = "Username cannot contain spaces";
    } else if (!/^@?[a-zA-Z0-9_-]+$/.test(value.replace("@", ""))) {
      newErrors.handle = "Username can only contain letters, numbers, underscores, and hyphens";
    } else {
      delete newErrors.handle;
    }
    setErrors(newErrors);
    return !newErrors.handle;
  };

  const validateDisplayName = (value: string) => {
    const newErrors = { ...errors };
    if (!value.trim()) {
      newErrors.displayName = "Display name cannot be empty";
    } else if (value.length > 50) {
      newErrors.displayName = "Display name must be 50 characters or less";
    } else {
      delete newErrors.displayName;
    }
    setErrors(newErrors);
    return !newErrors.displayName;
  };

  const validateBio = (value: string) => {
    const newErrors = { ...errors };
    if (value.length > 280) {
      newErrors.bio = "Bio must be 280 characters or less";
    } else {
      delete newErrors.bio;
    }
    setErrors(newErrors);
    return !newErrors.bio;
  };

  const handleSave = async () => {
    if (!validateDisplayName(editData.displayName) || !validateUsername(editData.handle) || !validateBio(editData.bio)) {
      return;
    }

    const nextProfile = {
      displayName: editData.displayName.trim(),
      handle: editData.handle.trim(),
      bio: editData.bio.trim(),
      tags: selectedTags,
    };

    setProfile(nextProfile);

    await persistProfileToSupabase({
      profile: {
        displayName: nextProfile.displayName,
        handle: nextProfile.handle,
        bio: nextProfile.bio,
        tier,
        tags: nextProfile.tags,
      },
      photo,
    });

    setIsEditing(false);
    pushNotification("Profile updated successfully!", "success");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      displayName,
      handle,
      bio,
    });
    setSelectedTags(tags);
    setErrors({});
  };

  const openEditMode = () => {
    setEditData({
      displayName,
      handle,
      bio,
    });
    setSelectedTags(tags);
    setErrors({});
    setIsEditing(true);
  };

  const toggleTag = (tag: string) => {
    const exists = selectedTags.includes(tag);
    if (exists) {
      setSelectedTags((prev) => prev.filter((item) => item !== tag));
      return;
    }
    if (selectedTags.length >= MAX_PROFILE_TAGS) {
      pushNotification(`You can select up to ${MAX_PROFILE_TAGS} tags only.`, "warning");
      return;
    }
    setSelectedTags((prev) => [...prev, tag]);
  };

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Profile" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-6xl space-y-5 overflow-x-hidden">
        <section className="glass overflow-hidden rounded-card border border-violet-400/20 bg-gradient-to-br from-violet-100/70 via-white/80 to-cyan-100/50 p-0 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_0_60px_rgba(168,85,247,0.08)] dark:border-violet-400/25 dark:bg-none dark:shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_0_60px_rgba(168,85,247,0.12)]">
          <div className="relative px-6 pb-6 pt-6 sm:px-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_25%,rgba(236,72,153,0.12),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.1),transparent_40%),linear-gradient(120deg,rgba(76,29,149,0.08),rgba(15,23,42,0.02))] dark:bg-[radial-gradient(circle_at_12%_25%,rgba(236,72,153,0.22),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.2),transparent_40%),linear-gradient(120deg,rgba(76,29,149,0.2),rgba(15,23,42,0.06))]" />
            <div className="pointer-events-none absolute -left-10 top-6 h-28 w-28 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl" />

            <div className="relative z-10 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
              <article className="relative rounded-card border border-violet-300/45 bg-gradient-to-br from-violet-200/70 via-white/80 to-fuchsia-100/60 p-5 shadow-[0_0_24px_rgba(168,85,247,0.14)] dark:border-violet-400/35 dark:from-violet-700/35 dark:via-violet-700/15 dark:to-fuchsia-500/12 dark:shadow-[0_0_24px_rgba(168,85,247,0.28)]">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={openEditMode}
                    title="Edit profile"
                    aria-label="Edit profile"
                    className="focus-ring absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-fuchsia-300/65 bg-fuchsia-500/22 text-slate-900 shadow-[0_8px_18px_rgba(217,70,239,0.26)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-fuchsia-500/30 dark:text-white dark:shadow-[0_10px_20px_rgba(217,70,239,0.38)]"
                  >
                    <PenSquare className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {isEditing ? (
                  <div className="absolute right-3 top-3 z-20 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={Object.keys(errors).length > 0}
                      className="focus-ring flex items-center gap-2 rounded-lg border border-green-400/55 bg-green-500/20 px-3 py-2 text-xs font-semibold text-green-100 shadow-[0_0_14px_rgba(34,197,94,0.3)] hover:bg-green-500/28 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="focus-ring flex items-center gap-2 rounded-lg border border-red-400/55 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100 shadow-[0_0_14px_rgba(248,113,113,0.28)] hover:bg-red-500/22"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                ) : null}
                <div className="relative mx-auto w-fit">
                  <div className="absolute inset-0 rounded-full bg-violet-400/25 blur-xl" />
                  {!isEditing && showOnlineStatus ? (
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
                    photo={photo}
                    fallbackText={isEditing ? editData.displayName : displayName}
                    className={cx(
                      "relative h-36 w-36 border-[3px]",
                      !isEditing && showOnlineStatus
                        ? "border-emerald-300/80 shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_0_30px_rgba(74,222,128,0.58)]"
                        : "border-violet-300/70"
                    )}
                    textClassName="text-4xl"
                    neon
                  />
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="focus-ring absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-violet-400/70 bg-violet-500/30 text-violet-100 backdrop-blur-sm hover:bg-violet-500/45"
                      aria-label="Change profile photo"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 text-center">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editData.displayName}
                        onChange={(e) => {
                          setEditData({ ...editData, displayName: e.target.value });
                          validateDisplayName(e.target.value);
                        }}
                        placeholder="Display Name"
                        className={cx(
                          "w-full rounded-lg border px-3 py-2 text-center font-sora text-xl font-bold transition-all duration-150",
                          "dark:bg-white/10 bg-black/5 dark:border-white/20 border-black/10 dark:text-white text-gray-900",
                          "dark:placeholder-white/30 placeholder-gray-400 focus:outline-none focus:ring-2",
                          errors.displayName ? "focus:ring-red-500/50 dark:focus:ring-red-500/30" : "focus:ring-violet-500/50 dark:focus:ring-violet-500/30"
                        )}
                      />
                      <input
                        type="text"
                        value={editData.handle}
                        onChange={(e) => {
                          setEditData({ ...editData, handle: e.target.value });
                          validateUsername(e.target.value);
                        }}
                        placeholder="@username"
                        className={cx(
                          "w-full rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all duration-150",
                          "dark:bg-white/10 bg-black/5 dark:border-white/20 border-black/10 dark:text-white text-gray-900",
                          "dark:placeholder-white/30 placeholder-gray-400 focus:outline-none focus:ring-2",
                          errors.handle ? "focus:ring-red-500/50 dark:focus:ring-red-500/30" : "focus:ring-violet-500/50 dark:focus:ring-violet-500/30"
                        )}
                      />
                      <textarea
                        value={editData.bio}
                        onChange={(e) => {
                          setEditData({ ...editData, bio: e.target.value });
                          validateBio(e.target.value);
                        }}
                        placeholder="Tell other players about your trivia style..."
                        rows={3}
                        className={cx(
                          "w-full resize-none rounded-lg border px-3 py-2 text-sm transition-all duration-150",
                          "dark:bg-white/10 bg-black/5 dark:border-white/20 border-black/10 dark:text-white text-gray-900",
                          "dark:placeholder-white/30 placeholder-gray-400 focus:outline-none focus:ring-2",
                          errors.bio ? "focus:ring-red-500/50 dark:focus:ring-red-500/30" : "focus:ring-violet-500/50 dark:focus:ring-violet-500/30"
                        )}
                      />
                      <p className="text-right text-[11px] text-[var(--text-secondary)]">{editData.bio.length}/280</p>
                    </div>
                  ) : (
                    <>
                      <h1 className="font-sora text-5xl font-bold leading-none tracking-tight text-slate-900 dark:text-white/95">{displayName}</h1>
                      <p className="mt-2 text-3xl text-slate-600 dark:text-white/65">{handle}</p>
                      <p className="mt-3 rounded-2xl border border-violet-300/35 bg-white/60 px-4 py-3 text-left text-sm leading-relaxed text-slate-700 dark:border-white/15 dark:bg-black/20 dark:text-white/75">
                        {bio || "No bio yet. Edit your profile to add one."}
                      </p>
                    </>
                  )}
                </div>
              </article>

              <div className="relative px-1 py-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-violet-500/12 px-2 py-0.5 font-sora text-[11px] font-semibold text-violet-700 dark:text-violet-100">
                    <Trophy className="h-3.5 w-3.5" /> {unlockedAchievementCount}/{achievementProgress.length}
                  </span>
                  <Link href="/achievements" className="focus-ring grid h-7 w-7 place-items-center rounded-full border border-cyan-300/40 bg-cyan-500/12 text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-500/20 dark:text-cyan-100" title="Open achievements" aria-label="Open achievements">
                    <Award className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {unlockedAchievementItems.length ? (
                  <div className="flex flex-wrap gap-2">
                    {unlockedAchievementItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <motion.div
                          key={`profile-achievement-${item.id}`}
                          title={`${item.title} (${item.rarity})`}
                          whileHover={{ y: -2, scale: 1.06, rotateX: 8, rotateY: -6 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          style={{ transformStyle: "preserve-3d" }}
                          className={cx(
                            "group relative grid h-9 w-9 place-items-center rounded-xl border [transform:perspective(600px)]",
                            `${achievementRarityClass[item.rarity]} shadow-[0_8px_14px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.42)]`
                          )}
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
                ) : (
                  <div className="rounded-2xl border border-white/20 bg-white/35 px-3 py-3 text-xs text-slate-600 dark:bg-white/5 dark:text-white/65">
                    No unlocked achievements yet.
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-violet-300/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(238,242,255,0.72),rgba(224,242,254,0.64))] p-3 shadow-[0_14px_28px_rgba(99,102,241,0.14),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md dark:border-violet-300/20 dark:bg-[linear-gradient(145deg,rgba(30,27,75,0.42),rgba(67,56,202,0.22),rgba(8,47,73,0.22))] dark:shadow-[0_16px_32px_rgba(15,23,42,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">Profile Tags</h3>
                  <div className="space-y-2">
                    {groupedProfileTags.map((group) => (
                      <div key={`profile-inline-tags-${group.title}`}>
                        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-white/65">{group.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.tags.length ? (
                            group.tags.map((tag) => (
                              <span key={`${group.title}-${tag}`} className="rounded-full border border-violet-300/35 bg-white/72 px-2.5 py-1 text-[11px] text-violet-700 shadow-[0_6px_14px_rgba(99,102,241,0.16)] ring-1 ring-white/45 dark:border-violet-300/30 dark:bg-violet-500/14 dark:text-violet-100 dark:shadow-[0_8px_16px_rgba(30,41,59,0.4)] dark:ring-white/10">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--text-secondary)]">No {group.title.toLowerCase()} selected.</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-5">
                <article className="rounded-card border border-violet-300/45 bg-gradient-to-br from-fuchsia-100 via-violet-100 to-cyan-100 p-4 shadow-[0_0_22px_rgba(167,139,250,0.14)] dark:from-fuchsia-500/18 dark:via-violet-500/20 dark:to-cyan-500/20 dark:shadow-[0_0_22px_rgba(167,139,250,0.25)]">
                  <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">Total Points</p>
                  <p className="mt-1 text-center font-sora text-5xl font-bold text-slate-900 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      <Star className="h-6 w-6" />
                      {totalPoints}
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
                      <span>{tier}</span>
                      <span>Master</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-violet-200/60 pt-3 text-center dark:border-white/15">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-white/70">Achievements</p>
                    <p className="mt-1 font-sora text-2xl font-semibold text-slate-900 dark:text-white">{unlockedAchievementCount}/{achievementProgress.length}</p>
                  </div>
                </article>

                <article className="rounded-card border border-cyan-300/45 bg-gradient-to-br from-cyan-100 via-sky-100 to-violet-100 p-4 shadow-[0_0_22px_rgba(56,189,248,0.14)] dark:from-cyan-500/16 dark:via-sky-500/18 dark:to-violet-500/16 dark:shadow-[0_0_22px_rgba(56,189,248,0.28)]">
                  <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">1v1 Battle Points</p>
                  <p className="mt-1 text-center font-sora text-5xl font-bold text-slate-900 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      <Swords className="h-6 w-6" />
                      {totalBattlePoints}
                    </span>
                  </p>

                  <div className="mt-4">
                    <div className="h-4 rounded-full border border-cyan-200/70 bg-white/80 p-1 dark:border-white/20 dark:bg-black/35">
                      <div
                        className="relative h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#3b82f6_45%,#8b5cf6_100%)] shadow-[0_0_16px_rgba(14,165,233,0.38)]"
                        style={{ width: `${battlePointsProgress}%` }}
                      >
                        <span className="absolute -right-1 top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between text-sm text-slate-600 dark:text-white/75">
                      <span>{battleTier}</span>
                      <span>Battle Master</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-cyan-300/35 bg-white/65 px-3 py-2 dark:border-white/15 dark:bg-black/20">
                      <p className="uppercase tracking-[0.14em] text-slate-500 dark:text-white/65">Win Rate</p>
                      <p className="mt-1 font-sora text-lg font-semibold text-slate-900 dark:text-white">{battleSummary.winRate}%</p>
                    </div>
                    <div className="rounded-xl border border-cyan-300/35 bg-white/65 px-3 py-2 dark:border-white/15 dark:bg-black/20">
                      <p className="uppercase tracking-[0.14em] text-slate-500 dark:text-white/65">Record</p>
                      <p className="mt-1 font-sora text-lg font-semibold text-slate-900 dark:text-white">{battleSummary.wins}W-{battleSummary.losses}L</p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-cyan-200/60 pt-3 text-center dark:border-white/15">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-white/70">Score For / Against</p>
                    <p className="mt-1 font-sora text-xl font-semibold text-slate-900 dark:text-white">{battleSummary.totalUserScore} / {battleSummary.totalOpponentScore}</p>
                  </div>
                </article>

              </div>
            </div>

            <div className="relative z-10 mt-6 border-t border-black/10 pt-4 dark:border-white/10">
              <div className="inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    aria-label={`Open ${tab} tab`}
                    onClick={() => setActiveTab(tab)}
                    disabled={isEditing}
                    className={cx(
                      "focus-ring arcade-btn rounded-full px-4 py-1.5 text-sm capitalize transition-all duration-150",
                      isEditing ? "cursor-not-allowed opacity-50" : "",
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

        <AnimatePresence initial={false}>
          {isEditing ? (
            <motion.section
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="glass rounded-card border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-sora text-lg font-semibold text-[var(--text-primary)]">Customize Your Profile</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Select up to {MAX_PROFILE_TAGS} tags. Selected tags appear instantly under your username.
                  </p>
                </div>
                <span className="rounded-full border border-violet-400/35 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-700 dark:text-violet-200">
                  {selectedTags.length}/{MAX_PROFILE_TAGS}
                </span>
              </div>

              <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
                {Object.entries(profileTagLibrary).map(([category, tags]) => (
                  <article key={category} className="rounded-card border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const selected = selectedTags.includes(tag);
                        const atLimit = selectedTags.length >= MAX_PROFILE_TAGS;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            disabled={!selected && atLimit}
                            className={cx(
                              "focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all",
                              selected
                                ? "bg-violet-500 text-white"
                                : "border border-black/15 bg-white/70 text-[var(--text-primary)] dark:border-white/20 dark:bg-white/5 dark:text-white/85",
                              !selected && atLimit ? "cursor-not-allowed opacity-45" : "hover:border-violet-400/60",
                            )}
                          >
                            <span>{tag}</span>
                            {selected ? <X className="h-3 w-3" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        {/* Stats Section - Read Only */}
        {activeTab === "stats" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Accuracy", `${accuracy}%`],
                ["Quizzes Completed", `${quizzesCompleted}`],
                ["Best Streak", `${bestStreak}`],
                ["Total Correct", `${totalCorrectAnswers}`],
                ["Questions Answered", `${totalAnsweredQuestions}`],
                ["Total Points", `${totalPoints}`],
              ].map(([label, value]) => (
                <article key={label} className="rounded-card border border-violet-300/30 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100 p-4 shadow-[0_0_18px_rgba(167,139,250,0.12)] dark:from-violet-500/14 dark:via-fuchsia-500/8 dark:to-cyan-500/12 dark:shadow-[0_0_18px_rgba(167,139,250,0.2)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/70">{label}</p>
                  <p className="mt-1 font-sora text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-card border border-violet-300/35 bg-gradient-to-br from-violet-100/85 via-fuchsia-50/80 to-cyan-100/75 p-4 shadow-[0_0_20px_rgba(167,139,250,0.12)] dark:from-violet-500/18 dark:via-fuchsia-500/12 dark:to-cyan-500/14 dark:shadow-[0_0_20px_rgba(167,139,250,0.2)]">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">
                  <BrainCircuit className="h-4 w-4" /> Trivia Journey Rankings
                </p>
                <div className="mt-3 grid gap-2">
                  {triviaRankings.map((item) => (
                    <div key={item.label} className="rounded-xl border border-violet-300/40 bg-white/70 px-3 py-2 dark:border-white/15 dark:bg-black/20">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-white/70">{item.label}</p>
                        <span className="rounded-full border border-violet-300/40 bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-100">{item.rating}</span>
                      </div>
                      <p className="mt-1 font-sora text-lg font-semibold text-slate-900 dark:text-white">{item.rank}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-card border border-cyan-300/35 bg-gradient-to-br from-cyan-100/85 via-sky-50/80 to-violet-100/75 p-4 shadow-[0_0_20px_rgba(34,211,238,0.12)] dark:from-cyan-500/14 dark:via-sky-500/10 dark:to-violet-500/16 dark:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200">
                  <Swords className="h-4 w-4" /> 1v1 Battle Rankings
                </p>
                <div className="mt-2 rounded-xl border border-cyan-300/35 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-white/15 dark:bg-black/20 dark:text-white/70">
                  {battleSummary.wins}W / {battleSummary.losses}L / {battleSummary.draws}D • Win rate {battleSummary.winRate}%
                </div>
                <div className="mt-2 grid gap-2">
                  {battleRankings.map((item) => (
                    <div key={item.label} className="rounded-xl border border-cyan-300/40 bg-white/70 px-3 py-2 dark:border-white/15 dark:bg-black/20">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-white/70">{item.label}</p>
                        <span className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:text-cyan-100">{item.rating}</span>
                      </div>
                      <p className="mt-1 font-sora text-lg font-semibold text-slate-900 dark:text-white">{item.rank}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {/* History Section */}
        {activeTab === "history" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-card border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setIsTriviaHistoryExpanded((value) => !value)}
                className="focus-ring mb-2 flex w-full items-center justify-between rounded-xl border border-violet-300/35 bg-violet-500/8 px-3 py-2 text-left"
              >
                <span className="inline-flex items-center gap-2 font-sora text-base font-semibold text-[var(--text-primary)]">
                  <BrainCircuit className="h-4 w-4 text-violet-500" /> Trivia Journey Sessions
                </span>
                {isTriviaHistoryExpanded ? <ChevronUp className="h-4 w-4 text-violet-500" /> : <ChevronDown className="h-4 w-4 text-violet-500" />}
              </button>
              <AnimatePresence initial={false}>
                {isTriviaHistoryExpanded ? (
                  <motion.div
                    key="trivia-history"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      {quizHistory.length ? (
                        quizHistory.map((item) => (
                          <article key={item.id} className="rounded-xl border border-violet-300/30 bg-gradient-to-r from-violet-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(129,140,248,0.12)] dark:from-violet-500/12 dark:via-violet-500/6 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(129,140,248,0.18)]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{item.category} Quiz • {item.difficulty}</p>
                                <p className="text-xs text-slate-600 dark:text-white/65">{new Date(item.completedAt).toLocaleString()}</p>
                              </div>
                              <span className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-100">
                                {item.correct}/{item.total}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-white/70">
                              <span>Accuracy {item.total ? Math.round((item.correct / item.total) * 100) : 0}%</span>
                              <span>{item.points} pts</span>
                            </div>
                          </article>
                        ))
                      ) : (
                        <article className="rounded-card border border-violet-300/25 bg-violet-500/8 p-4 text-sm text-slate-600 dark:text-white/75">
                          No quiz history yet. Complete a quiz to populate this section.
                        </article>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </article>

            <article className="rounded-card border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setIsBattleHistoryExpanded((value) => !value)}
                className="focus-ring mb-2 flex w-full items-center justify-between rounded-xl border border-cyan-300/35 bg-cyan-500/8 px-3 py-2 text-left"
              >
                <span className="inline-flex items-center gap-2 font-sora text-base font-semibold text-[var(--text-primary)]">
                  <Swords className="h-4 w-4 text-cyan-500" /> 1v1 Battle Sessions
                </span>
                {isBattleHistoryExpanded ? <ChevronUp className="h-4 w-4 text-cyan-500" /> : <ChevronDown className="h-4 w-4 text-cyan-500" />}
              </button>
              <AnimatePresence initial={false}>
                {isBattleHistoryExpanded ? (
                  <motion.div
                    key="battle-history"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      {battleHistory.length ? (
                        battleHistory.map((entry) => {
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
                            <article key={entry.id} className={`rounded-2xl border px-3 py-2 text-sm shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-md dark:shadow-[0_10px_26px_rgba(15,23,42,0.32)] ${shellClass}`}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-[var(--text-primary)]">{entry.mode} • vs {entry.opponentName}</p>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${badgeClass}`}>
                                  {entry.result.toUpperCase()}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {entry.category} • {entry.userScore}-{entry.opponentScore} • {new Date(entry.playedAt).toLocaleString()} • +{entry.pointsEarned} pts
                              </p>
                            </article>
                          );
                        })
                      ) : (
                        <article className="rounded-card border border-cyan-300/25 bg-cyan-500/8 p-4 text-sm text-slate-600 dark:text-white/75">
                          No 1v1 battle sessions yet. Finish a battle to populate this section.
                        </article>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </article>
          </section>
        ) : null}

        {/* Saved Facts Section */}
        {activeTab === "saved" ? (
          <section className="space-y-2">
            {savedFacts.length ? (
              savedFacts.map((fact) => (
                <article key={fact.id} className="rounded-card border border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(217,70,239,0.12)] dark:from-fuchsia-500/12 dark:via-violet-500/8 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(217,70,239,0.16)]">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-fuchsia-700 dark:text-fuchsia-100">{fact.category}</p>
                    <button
                      type="button"
                      onClick={() => toggleSave(fact.id)}
                      className="focus-ring rounded-full border border-fuchsia-300/45 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] text-fuchsia-700 hover:bg-fuchsia-500/20 dark:bg-fuchsia-500/15 dark:text-fuchsia-100 dark:hover:bg-fuchsia-500/25"
                    >
                      Remove
                    </button>
                  </div>
                  <h3 className="font-sora text-lg font-semibold text-slate-900 dark:text-white">{fact.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-white/75">{fact.body}</p>
                </article>
              ))
            ) : (
              <article className="rounded-card border border-fuchsia-300/25 bg-fuchsia-500/8 p-4 text-sm text-slate-600 dark:text-white/75">
                No saved facts yet. Save facts from Trivia Hub to see them here.
              </article>
            )}
          </section>
        ) : null}
        </div>
      </motion.main>

      <AnimatePresence>
        {isPhotoModalOpen ? (
          <ProfilePhotoModal
            onClose={() => setIsPhotoModalOpen(false)}
            fallbackText={editData.displayName}
            onSaved={async () => {
              await persistProfileToSupabase({
                profile: {
                  displayName,
                  handle,
                  bio,
                  tier,
                  tags,
                },
                photo: useProfilePhotoStore.getState().photo,
              });
              pushNotification("Profile photo updated successfully!", "success");
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

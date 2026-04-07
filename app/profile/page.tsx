"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, PenSquare, Camera, Check, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ProfilePhoto from "@/components/ProfilePhoto";
import ProfilePhotoModal from "@/components/ProfilePhotoModal";
import { categoryMeta, currentUser, triviaFacts } from "@/lib/mockData";
import { useNotificationStore } from "@/lib/notificationStore";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { MAX_PROFILE_TAGS, useProfileStore } from "@/lib/profileStore";
import { useSettingsStore } from "@/lib/settingsStore";
import { persistProfileToSupabase } from "@/lib/supabase/profilePersistence";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { useTriviaFactsStore } from "@/lib/triviaFactsStore";
import type { ProfileTab } from "@/lib/types";
import { cx } from "@/lib/utils";
import { getProgressionBadges } from "@/lib/quizProgression";

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

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const { displayName, handle, tags, tier, setProfile } = useProfileStore();
  const { pushNotification } = useNotificationStore();
  const { photo } = useProfilePhotoStore();
  const { showOnlineStatus } = useSettingsStore();
  const { quizzesCompleted, totalCorrectAnswers, totalAnsweredQuestions, bestStreak, totalPoints, quizHistory } = usePlayerStatsStore();
  const { savedFactIds, factSnapshots, toggleSave } = useTriviaFactsStore();
  const [editData, setEditData] = useState({
    displayName,
    handle,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const progressionBadges = useMemo(() => getProgressionBadges(quizHistory, categoryMeta.map((category) => category.name)), [quizHistory]);
  const visibleTags = isEditing ? selectedTags : tags;
  const achievementTags = useMemo(
    () => (isEditing ? visibleTags : Array.from(new Set([...visibleTags, ...progressionBadges])).slice(0, MAX_PROFILE_TAGS)),
    [isEditing, progressionBadges, visibleTags]
  );
  const pointsGoal = Math.max(1000, Math.ceil((totalPoints + 500) / 1000) * 1000);
  const pointsProgress = totalPoints > 0 ? Math.max(8, Math.min(100, Math.round((totalPoints / pointsGoal) * 100))) : 8;
  const caseSize = Math.max(1, Math.ceil(achievementTags.length / 3));
  const trophyCases = [
    {
      title: "Trophy Case 1",
      subtitle: "Performance Trophies",
      tags: achievementTags.slice(0, caseSize),
      tone: "from-rose-500/35 to-cyan-500/25",
      border: "border-rose-300/45",
    },
    {
      title: "Trophy Case 2",
      subtitle: "Intellect Badges",
      tags: achievementTags.slice(caseSize, caseSize * 2),
      tone: "from-violet-500/30 to-indigo-500/20",
      border: "border-violet-300/40",
    },
    {
      title: "Trophy Case 3",
      subtitle: "Interests & Titles",
      tags: achievementTags.slice(caseSize * 2),
      tone: "from-fuchsia-500/28 to-blue-500/22",
      border: "border-fuchsia-300/40",
    },
  ];

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

  const handleSave = async () => {
    if (!validateDisplayName(editData.displayName) || !validateUsername(editData.handle)) {
      return;
    }

    const nextProfile = {
      displayName: editData.displayName.trim(),
      handle: editData.handle.trim(),
      tags: selectedTags,
    };

    setProfile(nextProfile);

    await persistProfileToSupabase({
      profile: {
        displayName: nextProfile.displayName,
        handle: nextProfile.handle,
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
    });
    setSelectedTags(tags);
    setErrors({});
  };

  const openEditMode = () => {
    setEditData({
      displayName,
      handle,
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
              <article className="rounded-card border border-violet-300/45 bg-gradient-to-br from-violet-200/70 via-white/80 to-fuchsia-100/60 p-5 shadow-[0_0_24px_rgba(168,85,247,0.14)] dark:border-violet-400/35 dark:from-violet-700/35 dark:via-violet-700/15 dark:to-fuchsia-500/12 dark:shadow-[0_0_24px_rgba(168,85,247,0.28)]">
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
                    </div>
                  ) : (
                    <>
                      <h1 className="font-sora text-5xl font-bold leading-none tracking-tight text-slate-900 dark:text-white/95">{displayName}</h1>
                      <p className="mt-2 text-3xl text-slate-600 dark:text-white/65">{handle} • {currentUser.joinDate}</p>
                    </>
                  )}
                </div>
              </article>

              <div className="space-y-4">
                {trophyCases.map((item) => (
                  <article
                    key={item.title}
                    className={cx(
                      "rounded-card border bg-gradient-to-r p-3.5 shadow-sm",
                      item.border,
                      "from-white/80 via-white/70 to-cyan-100/55 text-slate-900 dark:from-violet-500/30 dark:via-indigo-500/20 dark:to-cyan-500/20 dark:text-white",
                    )}
                  >
                    <p className="font-sora text-lg font-semibold text-slate-900 dark:text-white/95">{item.title}</p>
                    <p className="text-sm text-slate-600 dark:text-white/65">{item.subtitle}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.tags.length ? (
                        item.tags.map((tag) => (
                          <button
                            key={`${item.title}-${tag}`}
                            type="button"
                            onClick={() => (isEditing ? toggleTag(tag) : undefined)}
                            className={cx(
                              "inline-flex items-center gap-1 rounded-full border border-violet-300/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/20 dark:bg-black/20 dark:text-white/92",
                              isEditing ? "focus-ring hover:border-fuchsia-300/70 hover:bg-fuchsia-500/20" : "cursor-default"
                            )}
                          >
                            {tag}
                            {isEditing ? <X className="h-3 w-3" /> : null}
                          </button>
                        ))
                      ) : (
                        <span className="rounded-full border border-violet-300/25 bg-violet-500/10 px-2.5 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-black/15 dark:text-white/60">No tags selected</span>
                      )}
                    </div>
                  </article>
                ))}
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
                    <p className="mt-1 font-sora text-2xl font-semibold text-slate-900 dark:text-white">{visibleTags.length}/{MAX_PROFILE_TAGS}</p>
                  </div>
                </article>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={openEditMode}
                    className="focus-ring ml-auto flex items-center gap-2 rounded-lg border border-fuchsia-300/60 bg-fuchsia-500/20 px-5 py-2.5 text-xl font-semibold text-slate-900 shadow-[0_0_16px_rgba(232,121,249,0.18)] hover:bg-fuchsia-500/28 dark:text-white dark:shadow-[0_0_16px_rgba(232,121,249,0.35)]"
                  >
                    <PenSquare className="h-4 w-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={Object.keys(errors).length > 0}
                      className="focus-ring flex items-center gap-2 rounded-lg border border-green-400/55 bg-green-500/20 px-4 py-2.5 text-sm font-semibold text-green-100 shadow-[0_0_14px_rgba(34,197,94,0.3)] hover:bg-green-500/28 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="focus-ring flex items-center gap-2 rounded-lg border border-red-400/55 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-100 shadow-[0_0_14px_rgba(248,113,113,0.28)] hover:bg-red-500/22"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                )}
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
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          </section>
        ) : null}

        {/* History Section */}
        {activeTab === "history" ? (
          <section className="space-y-2">
            {quizHistory.length ? (
              quizHistory.map((item) => (
                <article key={item.id} className="rounded-card border border-violet-300/30 bg-gradient-to-r from-violet-100 via-violet-50 to-cyan-100 p-4 shadow-[0_0_14px_rgba(129,140,248,0.12)] dark:from-violet-500/12 dark:via-violet-500/6 dark:to-cyan-500/10 dark:shadow-[0_0_14px_rgba(129,140,248,0.18)]">
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

"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, PenSquare, Camera, Check, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ProfilePhoto from "@/components/ProfilePhoto";
import ProfilePhotoModal from "@/components/ProfilePhotoModal";
import { currentUser, triviaFacts } from "@/lib/mockData";
import { useNotificationStore } from "@/lib/notificationStore";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { MAX_PROFILE_TAGS, useProfileStore } from "@/lib/profileStore";
import { persistProfileToSupabase } from "@/lib/supabase/profilePersistence";
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

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const { displayName, handle, tags, tier, setProfile } = useProfileStore();
  const { pushNotification } = useNotificationStore();
  const { photo } = useProfilePhotoStore();
  const [editData, setEditData] = useState({
    displayName,
    handle,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const savedFacts = useMemo(
    () => triviaFacts.filter((fact) => currentUser.savedFactIds.includes(fact.id)),
    []
  );

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

  const visibleTags = isEditing ? selectedTags : tags;

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
        <section className="glass overflow-hidden rounded-card border border-violet-400/15 p-0">
          <div className="relative px-6 pb-5 pt-6 sm:px-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-violet-500/18 via-fuchsia-500/12 to-cyan-500/12" />

            <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              {/* Avatar Section */}
              <div className="relative">
                <ProfilePhoto
                  photo={photo}
                  fallbackText={isEditing ? editData.displayName : displayName}
                  className="h-20 w-20 border-2 border-violet-400/70"
                  textClassName="text-2xl"
                  neon
                />
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="focus-ring absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-violet-400/60 bg-violet-500/25 text-violet-100 backdrop-blur-sm hover:bg-violet-500/40"
                    aria-label="Change profile photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* Profile Info */}
              <div className="min-w-[240px] flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Display Name Input */}
                    <div>
                      <input
                        type="text"
                        value={editData.displayName}
                        onChange={(e) => {
                          setEditData({ ...editData, displayName: e.target.value });
                          validateDisplayName(e.target.value);
                        }}
                        placeholder="Display Name"
                        className={cx(
                          "w-full rounded-lg border px-3 py-2 font-sora text-lg font-bold transition-all duration-150",
                          "dark:bg-white/10 bg-black/5 dark:border-white/20 border-black/10 dark:text-white text-gray-900",
                          "dark:placeholder-white/30 placeholder-gray-400 focus:outline-none focus:ring-2",
                          errors.displayName ? "focus:ring-red-500/50 dark:focus:ring-red-500/30" : "focus:ring-violet-500/50 dark:focus:ring-violet-500/30"
                        )}
                      />
                      {errors.displayName && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.displayName}</p>
                      )}
                    </div>

                    {/* Handle/Username Input */}
                    <div>
                      <input
                        type="text"
                        value={editData.handle}
                        onChange={(e) => {
                          setEditData({ ...editData, handle: e.target.value });
                          validateUsername(e.target.value);
                        }}
                        placeholder="@username"
                        className={cx(
                          "w-full rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150",
                          "dark:bg-white/10 bg-black/5 dark:border-white/20 border-black/10 dark:text-white text-gray-900",
                          "dark:placeholder-white/30 placeholder-gray-400 focus:outline-none focus:ring-2",
                          errors.handle ? "focus:ring-red-500/50 dark:focus:ring-red-500/30" : "focus:ring-violet-500/50 dark:focus:ring-violet-500/30"
                        )}
                      />
                      {errors.handle && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.handle}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="font-sora text-3xl font-bold tracking-tight text-[var(--text-primary)]">{displayName}</h1>
                    <p className="text-sm text-[var(--text-secondary)]">{handle} • {currentUser.joinDate}</p>
                  </>
                )}

                {/* Selected Tags */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleTags.map((tag) => (
                    <span
                      key={tag}
                      className={cx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        isEditing ? "bg-violet-500 text-white" : "border border-black/10 bg-black/5 text-[var(--text-primary)] dark:border-white/15 dark:bg-white/5 dark:text-white/90"
                      )}
                    >
                      {tag}
                      {isEditing ? <X className="h-3 w-3" /> : null}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Points Section & Action Button */}
            <div className="grid gap-3 lg:justify-items-end">
              <div className="w-full rounded-card border border-violet-400/30 bg-gradient-to-br from-violet-500/16 to-violet-700/8 px-5 py-3 text-left lg:text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">Total Points</p>
                <p className="mt-1 inline-flex items-center gap-2 font-sora text-2xl font-bold text-violet-700 dark:text-violet-100">
                  <Star className="h-5 w-5" />
                  {currentUser.points}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Tier: {tier}</p>
              </div>

              {/* Edit/Save/Cancel Buttons */}
              {!isEditing ? (
                <button
                  type="button"
                  onClick={openEditMode}
                  className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-violet-400/50 bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors duration-150 hover:bg-violet-500/25 dark:text-violet-300 dark:hover:bg-violet-500/20 lg:w-auto"
                >
                  <PenSquare className="h-4 w-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex w-full gap-2 lg:w-auto">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={Object.keys(errors).length > 0}
                    className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-500/50 bg-green-500/15 px-4 py-2.5 text-sm font-medium text-green-700 transition-colors duration-150 hover:bg-green-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-300 dark:hover:bg-green-500/20 lg:flex-none"
                  >
                    <Check className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/10 lg:flex-none"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="relative z-10 mt-6 border-t border-black/10 pt-4 dark:border-white/10">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
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
                  activeTab === tab ? "bg-violet-500/35 text-violet-100" : "text-[var(--text-secondary)]"
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
              className="glass rounded-card p-5"
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
                  <article key={category} className="rounded-card border border-black/8 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
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
              ["Accuracy", `${currentUser.accuracy}%`],
              ["Quizzes", `${currentUser.quizCount}`],
              ["Current Rank", `#${currentUser.rank}`],
              ["Battle Streak", `${currentUser.streak}`],
              ["Tier", currentUser.tier],
              ["Score", `${currentUser.score}`],
            ].map(([label, value]) => (
              <article key={label} className="glass rounded-card p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
                <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
              </article>
            ))}
          </section>
        ) : null}

        {/* History Section */}
        {activeTab === "history" ? (
          <section className="space-y-2">
            {currentUser.quizHistory.map((item) => (
              <article key={item.id} className="glass flex flex-wrap items-center justify-between gap-2 rounded-card p-4">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.category} • {item.date}</p>
                </div>
                <span className="rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 text-sm text-green-800 dark:text-green-200">
                  {item.score}
                </span>
              </article>
            ))}
          </section>
        ) : null}

        {/* Saved Facts Section */}
        {activeTab === "saved" ? (
          <section className="space-y-2">
            {savedFacts.map((fact) => (
              <article key={fact.id} className="glass rounded-card p-4">
                <p className="mb-1 text-xs text-violet-700 dark:text-violet-200">{fact.category}</p>
                <h3 className="font-sora text-lg font-semibold text-[var(--text-primary)]">{fact.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{fact.body}</p>
              </article>
            ))}
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

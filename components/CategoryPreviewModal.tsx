"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Lock, X } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ProgressionInfoDialog from "@/components/ProgressionInfoDialog";
import {
  faFlask,
  faClapperboard,
  faLandmark,
  faLeaf,
  faUtensils,
  faPaw,
  faBriefcase,
  faMicrochip,
} from "@fortawesome/free-solid-svg-icons";
import { categoryMeta, leaderboardUsers } from "@/lib/mockData";
import type { Difficulty } from "@/lib/types";
import { useSettingsStore } from "@/lib/settingsStore";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { getPassedQuestionCounts, getUnlockedDifficultiesForCategory, questionCountOptions } from "@/lib/quizProgression";

const iconMap = {
  flask: faFlask,
  landmark: faLandmark,
  microchip: faMicrochip,
  leaf: faLeaf,
  clapperboard: faClapperboard,
  utensils: faUtensils,
  paw: faPaw,
  briefcase: faBriefcase,
} as const;

const categoryImages: Record<string, string> = {
  Science: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=300&fit=crop&q=80",
  History: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=300&fit=crop&q=80",
  Tech: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=300&fit=crop&q=80",
  Nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=300&fit=crop&q=80",
  Arts: "https://images.unsplash.com/photo-1561214115-6d2f1b0609fa?w=800&h=300&fit=crop&q=80",
  Anime: "https://images.unsplash.com/photo-1578269175736-a6fb3e62c7d5?w=800&h=300&fit=crop&q=80",
  Food: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=300&fit=crop&q=80",
  Animals: "https://images.unsplash.com/photo-1447614521780-c686fcb1d64d?w=800&h=300&fit=crop&q=80",
  Business: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=300&fit=crop&q=80",
};

const categoryDescriptions: Record<string, { description: string }> = {
  Science: {
    description: "Explore fundamental scientific concepts, from physics and chemistry to biology and earth science. Test your knowledge across multiple scientific disciplines.",
  },
  History: {
    description: "Journey through time with questions on world events, historical figures, and pivotal moments. Discover fascinating facts from ancient to modern times.",
  },
  Tech: {
    description: "Challenge yourself with technology questions spanning programming, hardware, and innovation. Perfect for tech enthusiasts and professionals.",
  },
  Nature: {
    description: "Dive into the natural world with questions about ecosystems, wildlife, and environmental science. Connect with the wonders of planet Earth.",
  },
  Arts: {
    description: "Explore creativity and culture with questions on visual arts, music, literature, and performing arts. Celebrate human artistic expression.",
  },
  Anime: {
    description: "Test your anime knowledge with questions about popular series, characters, and studio classics. Perfect for anime fans and enthusiasts.",
  },
  Food: {
    description: "Explore culinary traditions, cooking techniques, and food culture from around the world. A tasty challenge for food lovers.",
  },
  Animals: {
    description: "Learn about animal behavior, species facts, and wildlife conservation. Perfect for nature and animal enthusiasts.",
  },
  Business: {
    description: "Master business concepts, economics, and entrepreneurship. Challenge yourself with corporate knowledge and financial literacy.",
  },
};

interface CategoryPreviewModalProps {
  isOpen: boolean;
  category: (typeof categoryMeta)[0] | null;
  onClose: () => void;
  onCategoryChange?: (category: (typeof categoryMeta)[0]) => void;
}

export default function CategoryPreviewModal({ isOpen, category, onClose, onCategoryChange }: CategoryPreviewModalProps) {
  if (!category) return null;

  return (
    <CategoryPreviewModalInner
      isOpen={isOpen}
      category={category}
      onClose={onClose}
      onCategoryChange={onCategoryChange}
    />
  );
}

interface CategoryPreviewModalInnerProps {
  isOpen: boolean;
  category: (typeof categoryMeta)[0];
  onClose: () => void;
  onCategoryChange?: (category: (typeof categoryMeta)[0]) => void;
}

function CategoryPreviewModalInner({ isOpen, category, onClose, onCategoryChange }: CategoryPreviewModalInnerProps) {
  const router = useRouter();
  const controlsRef = useRef<HTMLDivElement>(null);
  const showDifficultyProgressionDialog = useSettingsStore((state) => state.showDifficultyProgressionDialog);
  const setShowDifficultyProgressionDialog = useSettingsStore((state) => state.setShowDifficultyProgressionDialog);
  const { quizHistory } = usePlayerStatsStore();
  const [starting, setStarting] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Easy");
  const [questionCount, setQuestionCount] = useState(10);
  const [openMenu, setOpenMenu] = useState<"difficulty" | "questions" | null>(null);
  const [showProgressionDialog, setShowProgressionDialog] = useState(false);

  const unlockedByCategory = useMemo(() => getUnlockedDifficultiesForCategory(quizHistory, category.name), [category.name, quizHistory]);
  const activeDifficulty: Difficulty = unlockedByCategory[selectedDifficulty] ? selectedDifficulty : "Easy";
  const passedQuestionCounts = useMemo(() => getPassedQuestionCounts(quizHistory, category.name, activeDifficulty), [activeDifficulty, category.name, quizHistory]);
  const easyPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, category.name, "Easy").size, [category.name, quizHistory]);
  const mediumPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, category.name, "Medium").size, [category.name, quizHistory]);
  const hardPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, category.name, "Hard").size, [category.name, quizHistory]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const icon = iconMap[category.iconName] ?? faFlask;
  const categoryInfo = categoryDescriptions[category.name] || {
    description: "Challenge yourself with engaging questions.",
  };

  // Get recommended categories (2 others)
  const recommended = categoryMeta.filter((c) => c.name !== category.name).slice(0, 2);
  const imageUrl = categoryImages[category.name] || categoryImages.Science;

  const handleRecommendedClick = (rec: (typeof categoryMeta)[0]) => {
    if (onCategoryChange) {
      onCategoryChange(rec);
    }
  };

  // Generate category-specific leaderboard by hashing the category name
  const getCategoryLeaderboard = () => {
    const categoryHash = category.name.charCodeAt(0) + category.name.charCodeAt(category.name.length - 1);
    const shuffled = [...leaderboardUsers].sort((a, b) => {
      const hashA = (a.id.charCodeAt(0) + categoryHash) % 100;
      const hashB = (b.id.charCodeAt(0) + categoryHash) % 100;
      return hashB - hashA;
    });
    return shuffled.slice(0, 3);
  };

  const categoryLeaderboard = getCategoryLeaderboard();

  const startFromModal = () => {
    setStarting(true);
    setTimeout(() => {
      onClose();
      router.push(`/quiz?instant=1&category=${encodeURIComponent(category.name)}&difficulty=${encodeURIComponent(activeDifficulty)}&count=${questionCount}`);
    }, 400);
  };

  const handleStart = () => {
    if (!unlockedByCategory[activeDifficulty]) return;

    if (showDifficultyProgressionDialog) {
      setShowProgressionDialog(true);
      return;
    }

    startFromModal();
  };

  const handleConfirmProgressionDialog = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      setShowDifficultyProgressionDialog(false);
    }

    setShowProgressionDialog(false);
    startFromModal();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="glass relative w-full max-w-2xl rounded-card border border-violet-400/20 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="focus-ring absolute right-4 top-4 z-10 p-1.5 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Category Image */}
            <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-violet-500/20 to-violet-900/20">
              <Image
                src={imageUrl}
                alt={category.name}
                fill
                className="object-cover opacity-70"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
            </div>

            {/* Header with Icon */}
            <div className="relative -mt-12 px-5 sm:px-6 pb-4 flex items-end gap-4 z-10">
              <div
                className="flex-shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-xl border-2 flex items-center justify-center shadow-lg"
                style={{ borderColor: category.color, backgroundColor: `${category.color}15` }}
              >
                <FontAwesomeIcon icon={icon} className="h-10 w-10 sm:h-12 sm:w-12" style={{ color: category.color }} />
              </div>
              <div className="pb-2">
                <h1 className="font-sora text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{category.name}</h1>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6 p-5 sm:p-6">
              {/* Description */}
              <div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{categoryInfo.description}</p>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-card border border-black/8 dark:border-white/10 bg-white/40 dark:bg-white/5 p-3 text-center">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">Questions</p>
                  <p className="font-sora font-bold text-[var(--text-primary)]">{questionCount}</p>
                </div>
                <div className="rounded-card border border-black/8 dark:border-white/10 bg-white/40 dark:bg-white/5 p-3 text-center">
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">Level</p>
                  <p className="font-sora font-bold text-[var(--text-primary)]">{activeDifficulty}</p>
                </div>
              </div>

              {/* Difficulty & Question Count Selection */}
              <div ref={controlsRef} className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="difficulty-select" className="mb-2 block text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    Difficulty
                  </label>
                  <div className="relative">
                    <button
                      id="difficulty-select"
                      type="button"
                      onClick={() => setOpenMenu((prev) => (prev === "difficulty" ? null : "difficulty"))}
                      className="focus-ring flex w-full items-center justify-between rounded-card border border-violet-400/35 bg-white/70 px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-all duration-150 hover:border-violet-400 dark:bg-white/5"
                    >
                      <span>{activeDifficulty}</span>
                      <ChevronDown className={`h-4 w-4 text-violet-400 transition-transform ${openMenu === "difficulty" ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {openMenu === "difficulty" ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute z-20 mt-2 w-full overflow-hidden rounded-card border border-violet-400/35 bg-[var(--bg-secondary)]/95 p-1 backdrop-blur-md shadow-[0_14px_28px_rgba(124,58,237,0.25)]"
                        >
                          {(["Easy", "Medium", "Hard"] as const).map((difficulty) => (
                            (() => {
                              const unlocked = unlockedByCategory[difficulty];

                              return (
                            <button
                              key={difficulty}
                              type="button"
                              disabled={!unlocked}
                              onClick={() => {
                                if (!unlocked) return;
                                setSelectedDifficulty(difficulty);
                                setOpenMenu(null);
                              }}
                              className={[
                                "focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm",
                                !unlocked ? "cursor-not-allowed opacity-55" : "",
                                activeDifficulty === difficulty
                                  ? "bg-violet-500/25 text-violet-100"
                                  : "text-[var(--text-primary)] hover:bg-violet-500/12",
                              ].join(" ")}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {difficulty}
                                {!unlocked ? <Lock className="h-3 w-3" /> : null}
                              </span>
                              {activeDifficulty === difficulty ? <Check className="h-3.5 w-3.5" /> : null}
                            </button>
                              );
                            })()
                          ))}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
                <div>
                  <label htmlFor="question-select" className="mb-2 block text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    Questions
                  </label>
                  <div className="relative">
                    <button
                      id="question-select"
                      type="button"
                      onClick={() => setOpenMenu((prev) => (prev === "questions" ? null : "questions"))}
                      className="focus-ring flex w-full items-center justify-between rounded-card border border-violet-400/35 bg-white/70 px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-all duration-150 hover:border-violet-400 dark:bg-white/5"
                    >
                      <span>{questionCount} Qs</span>
                      <ChevronDown className={`h-4 w-4 text-violet-400 transition-transform ${openMenu === "questions" ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {openMenu === "questions" ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute z-20 mt-2 w-full overflow-hidden rounded-card border border-violet-400/35 bg-[var(--bg-secondary)]/95 p-1 backdrop-blur-md shadow-[0_14px_28px_rgba(124,58,237,0.25)]"
                        >
                          {questionCountOptions.map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() => {
                                setQuestionCount(count);
                                setOpenMenu(null);
                              }}
                              className={[
                                "focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm",
                                questionCount === count
                                  ? "bg-violet-500/25 text-violet-100"
                                  : "text-[var(--text-primary)] hover:bg-violet-500/12",
                              ].join(" ")}
                            >
                              <span className="inline-flex items-center gap-2">
                                {count} Qs
                                {passedQuestionCounts.has(count) ? <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-200">Passed</span> : null}
                              </span>
                              {questionCount === count ? <Check className="h-3.5 w-3.5" /> : null}
                            </button>
                          ))}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Category Leaderboard */}
              <div>
                <p className="mb-3 text-xs uppercase tracking-wide text-[var(--text-secondary)]">Top Performers in {category.name}</p>
                <div className="space-y-2">
                  {categoryLeaderboard.map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-card border border-black/8 dark:border-white/10 bg-white/40 dark:bg-white/5 p-3"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.username}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{user.tier} · {user.accuracy}% accuracy</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-sora font-bold text-[var(--text-primary)]">{user.score}</p>
                        <p className="text-xs text-[var(--text-secondary)]">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Categories */}
              {recommended.length > 0 && (
                <div>
                  <p className="mb-3 text-xs uppercase tracking-wide text-[var(--text-secondary)]">Suggested for You</p>
                  <div className="grid grid-cols-2 gap-2">
                    {recommended.map((rec) => {
                      const recIcon = iconMap[rec.iconName] ?? faFlask;
                      return (
                        <button
                          key={rec.name}
                          type="button"
                          onClick={() => handleRecommendedClick(rec)}
                          className="focus-ring rounded-card border border-black/8 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3 flex items-start gap-2 hover:border-violet-400 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-150"
                        >
                          <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10">
                            <FontAwesomeIcon icon={recIcon} className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-medium text-[var(--text-primary)]">{rec.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{rec.questionCount} Q</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStart}
                disabled={starting || !unlockedByCategory[activeDifficulty]}
                className="arcade-btn btn-primary w-full rounded-button px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {starting ? "Starting..." : "Confirm & Start"}
                {!starting && <span>→</span>}
              </button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <ProgressionInfoDialog
        isOpen={showProgressionDialog}
        categoryName={category.name}
        easyPassed={easyPassedCount}
        mediumPassed={mediumPassedCount}
        hardPassed={hardPassedCount}
        onCancel={() => setShowProgressionDialog(false)}
        onConfirm={handleConfirmProgressionDialog}
      />
    </>
  );
}

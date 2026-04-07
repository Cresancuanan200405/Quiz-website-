"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Lock } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import Timer from "@/components/Timer";
import AnswerButton from "@/components/AnswerButton";
import CategoryCard from "@/components/CategoryCard";
import ProgressionInfoDialog from "@/components/ProgressionInfoDialog";
import { categoryMeta, questions } from "@/lib/mockData";
import type { AnswerRecord, Difficulty, Question } from "@/lib/types";
import { calculatePoints } from "@/lib/utils";
import { useSettingsStore } from "@/lib/settingsStore";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { getPassedQuestionCounts, getUnlockedDifficultiesForCategory, questionCountOptions } from "@/lib/quizProgression";

const letters = ["A", "B", "C", "D"];
const difficultyOptions: Difficulty[] = ["Easy", "Medium", "Hard"];
const QUESTION_POOL_TARGET = 72;

const categoryTopicMap: Record<string, string[]> = {
  Science: ["atoms", "energy", "ecosystems", "genetics", "astronomy", "climate"],
  History: ["civilizations", "empires", "revolutions", "treaties", "leaders", "timelines"],
  Tech: ["algorithms", "networks", "hardware", "security", "ai", "databases"],
  Nature: ["biomes", "species", "weather", "rivers", "forests", "oceans"],
  Arts: ["painting", "sculpture", "music", "cinema", "theater", "literature"],
  Anime: ["studios", "genres", "soundtracks", "characters", "story arcs", "worldbuilding"],
  Food: ["ingredients", "techniques", "cuisines", "nutrition", "spices", "fermentation"],
  Animals: ["habitats", "adaptations", "behavior", "migration", "taxonomy", "conservation"],
  Business: ["strategy", "marketing", "finance", "operations", "leadership", "growth"],
};

const shuffleArray = <T,>(items: T[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const createGeneratedQuestion = (category: string, difficulty: Difficulty, sequence: number): Question => {
  const topics = categoryTopicMap[category] ?? ["concept", "pattern", "system", "theory", "model", "insight"];
  const primary = topics[sequence % topics.length];
  const secondary = topics[(sequence + 2) % topics.length];
  const emphasis = difficulty === "Easy" ? "core" : difficulty === "Medium" ? "applied" : "expert";

  const options = [
    `Focuses on ${primary} in a ${emphasis} context`,
    `Combines ${secondary} with ${primary} evidence`,
    `Prioritizes unrelated assumptions over ${primary}`,
    `Ignores both ${primary} and ${secondary} signals`,
  ] as [string, string, string, string];

  const correctIndex = (sequence + category.length + difficulty.length) % options.length;

  return {
    id: `gen-${category.toLowerCase()}-${difficulty.toLowerCase()}-${sequence}`,
    category: category as Question["category"],
    difficulty,
    question: `${category} ${difficulty} Challenge ${sequence + 1}: which statement best matches a ${primary}-driven ${emphasis} scenario?`,
    options,
    correctAnswer: options[correctIndex],
    explanation: `This challenge emphasizes ${primary}. The correct option keeps ${primary} as the main signal and avoids unrelated assumptions.`,
  };
};

const withExpandedPool = (category: string, difficulty: Difficulty, exactMatch: Question[]) => {
  const base = [...exactMatch];

  if (base.length >= QUESTION_POOL_TARGET) {
    return base;
  }

  const generated: Question[] = [];
  for (let index = 0; index < QUESTION_POOL_TARGET; index += 1) {
    generated.push(createGeneratedQuestion(category, difficulty, index));
  }

  const merged = [...base, ...generated];
  return merged.filter((question, index, all) => all.findIndex((item) => item.id === question.id) === index);
};

const categoryDescriptions: Record<string, { description: string }> = {
  Science: { description: "Experiments, discoveries, and wild science facts." },
  History: { description: "Civilizations, wars, and moments that changed the world." },
  Tech: { description: "Code, gadgets, and digital-era breakthroughs." },
  Nature: { description: "Wildlife, ecosystems, and the planet's wonders." },
  Arts: { description: "Masterpieces, music, and performance culture." },
  Anime: { description: "Iconic characters, studios, and anime universes." },
  Food: { description: "Cuisine, ingredients, and global food culture." },
  Animals: { description: "Species, behavior, and fascinating creature trivia." },
  Business: { description: "Markets, strategy, and entrepreneurial insights." },
};

export default function QuizPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const controlsRef = useRef<HTMLDivElement>(null);
  const instantStartedRef = useRef(false);
  const bypassBackGuardRef = useRef(false);
  const nextQuestionDelaySeconds = useSettingsStore((state) => state.nextQuestionDelaySeconds);
  const showDifficultyProgressionDialog = useSettingsStore((state) => state.showDifficultyProgressionDialog);
  const setShowDifficultyProgressionDialog = useSettingsStore((state) => state.setShowDifficultyProgressionDialog);
  const { recordQuizSession, quizHistory } = usePlayerStatsStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(10);
  const [openMenu, setOpenMenu] = useState<"difficulty" | "questions" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [feedback, setFeedback] = useState<{ status: "correct" | "wrong"; text: string } | null>(null);
  const [quizStart, setQuizStart] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [showProgressionDialog, setShowProgressionDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const currentQuestion = quizQuestions[currentIndex];
  const currentOptions = useMemo(() => currentQuestion?.options ?? [], [currentQuestion]);
  const unlockedByCategory = useMemo(() => getUnlockedDifficultiesForCategory(quizHistory, selectedCategory), [quizHistory, selectedCategory]);
  const unlockedDifficulties: Record<Difficulty, boolean> = useMemo(
    () => ({
      Easy: true,
      Medium: unlockedByCategory.Medium,
      Hard: unlockedByCategory.Hard,
    }),
    [unlockedByCategory.Hard, unlockedByCategory.Medium]
  );
  const effectiveDifficulty: Difficulty | null = selectedCategory
    ? selectedDifficulty && unlockedDifficulties[selectedDifficulty]
      ? selectedDifficulty
      : "Easy"
    : null;
  const passedQuestionCounts = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, effectiveDifficulty), [effectiveDifficulty, quizHistory, selectedCategory]);
  const easyPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, "Easy").size, [quizHistory, selectedCategory]);
  const mediumPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, "Medium").size, [quizHistory, selectedCategory]);
  const hardPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, "Hard").size, [quizHistory, selectedCategory]);

  const buildQuizQuestions = useCallback((category: string, difficulty: Difficulty, questionCount: number) => {
    const exactMatch = questions.filter((question) => question.category === category && question.difficulty === difficulty);
    const uniquePool = withExpandedPool(category, difficulty, exactMatch);
    const shuffledPool = shuffleArray(uniquePool);

    // Avoid repeating the exact previous set for the same category+difficulty+count.
    if (typeof window !== "undefined") {
      const memoryKey = `last-quiz-set:${category}:${difficulty}:${questionCount}`;
      const previousRaw = window.localStorage.getItem(memoryKey);
      const previousIds = previousRaw ? (JSON.parse(previousRaw) as string[]) : [];

      const filtered = shuffledPool.filter((question) => !previousIds.includes(question.id));
      const selected = (filtered.length >= questionCount ? filtered : shuffledPool).slice(0, questionCount);
      window.localStorage.setItem(memoryKey, JSON.stringify(selected.map((question) => question.id)));
      return selected;
    }

    return shuffledPool.slice(0, questionCount);
  }, []);

  const calculateBestStreak = useCallback((records: AnswerRecord[]) => {
    let run = 0;
    let best = 0;

    for (const record of records) {
      if (record.isCorrect) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }

    return best;
  }, []);

  const goToNextQuestion = useCallback(() => {
    const isLastQuestion = currentIndex >= quizQuestions.length - 1;
    if (isLastQuestion) {
      const totalTime = quizStart ? Math.round((Date.now() - quizStart) / 1000) : 0;
      recordQuizSession({
        category: selectedCategory ?? "Mixed",
        difficulty: selectedDifficulty ?? "Mixed",
        questionCount: quizQuestions.length,
        correct: score,
        total: quizQuestions.length,
        passed: score >= quizQuestions.length,
        bestStreak: calculateBestStreak(answers),
        points,
      });
      router.push(
        `/results?score=${score}&total=${quizQuestions.length}&category=${encodeURIComponent(selectedCategory ?? "Mixed")}&difficulty=${encodeURIComponent(selectedDifficulty ?? "Easy")}&count=${quizQuestions.length}&timeTaken=${totalTime}&points=${points || calculatePoints(answers)}`
      );
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setFeedback(null);
    setTimeLeft(15);
    setNextQuestionCountdown(0);
  }, [answers, calculateBestStreak, currentIndex, points, quizQuestions.length, quizStart, recordQuizSession, router, score, selectedCategory, selectedDifficulty]);

  const startQuizSession = useCallback((category: string, difficulty: Difficulty, questionCount: number) => {
    const nextQuestions = buildQuizQuestions(category, difficulty, questionCount);
    if (!nextQuestions.length) return;

    setSelectedCategory(category);
    setSelectedDifficulty(difficulty);
    setSelectedQuestionCount(questionCount);
    setQuizQuestions(nextQuestions);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setScore(0);
    setStreak(0);
    setPoints(0);
    setAnswers([]);
    setFeedback(null);
    setQuizStart(Date.now());
    setHasStarted(true);
    setTimeLeft(15);
    setNextQuestionCountdown(0);
  }, [buildQuizQuestions]);

  const startQuiz = () => {
    if (!selectedCategory || !effectiveDifficulty) return;
    startQuizSession(selectedCategory, effectiveDifficulty, selectedQuestionCount);
  };

  const handleStartClick = () => {
    if (!selectedCategory || !effectiveDifficulty) return;

    if (showDifficultyProgressionDialog) {
      setShowProgressionDialog(true);
      return;
    }

    startQuiz();
  };

  const handleConfirmProgressionDialog = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      setShowDifficultyProgressionDialog(false);
    }
    setShowProgressionDialog(false);
    startQuiz();
  };

  const revealAnswer = useCallback(
    (answer: string | null, timedOut?: boolean) => {
      if (isRevealed || !currentQuestion) return;

      const isCorrect = answer === currentQuestion.correctAnswer;
      const timeSpent = 15 - timeLeft;

      setIsRevealed(true);
      setSelectedAnswer(answer);
      setNextQuestionCountdown(nextQuestionDelaySeconds);
      setAnswers((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selectedAnswer: answer,
          isCorrect,
          timeSpent,
        },
      ]);

      if (isCorrect) {
        const timeFactor = Math.max(0, timeLeft) / 15;
        let earnedPoints = 0;
        let multiplier = 1;

        setScore((prev) => prev + 1);
        setStreak((prev) => {
          const nextStreak = prev + 1;
          multiplier = 1 + Math.min(1.5, (nextStreak - 1) * 0.1);
          const basePoints = 60;
          const timeBonus = Math.round(70 * timeFactor);
          earnedPoints = Math.round((basePoints + timeBonus) * multiplier);
          setPoints((currentPoints) => currentPoints + earnedPoints);
          return nextStreak;
        });

        setFeedback({
          status: "correct",
          text: `+${earnedPoints} pts (x${multiplier.toFixed(1)} streak). ${currentQuestion.explanation}`,
        });
      } else {
        setStreak(0);
        setFeedback({
          status: "wrong",
          text: timedOut
            ? `Time's up. Correct answer: ${currentQuestion.correctAnswer}. ${currentQuestion.explanation}`
            : `Correct answer: ${currentQuestion.correctAnswer}. ${currentQuestion.explanation}`,
        });
      }
    },
    [currentQuestion, isRevealed, nextQuestionDelaySeconds, timeLeft]
  );

  const onSelect = useCallback(
    (option: string) => {
      if (!hasStarted || isRevealed) return;
      setSelectedAnswer(option);
      setTimeout(() => revealAnswer(option), 600);
    },
    [hasStarted, isRevealed, revealAnswer]
  );

  useEffect(() => {
    if (!hasStarted || isRevealed) return;
    const timer = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            revealAnswer(null, true);
          }, 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [goToNextQuestion, hasStarted, isRevealed, revealAnswer]);

  useEffect(() => {
    if (!hasStarted || !isRevealed) return;

    if (nextQuestionCountdown > 0) {
      const countdownTimer = window.setTimeout(() => {
        setNextQuestionCountdown((value) => Math.max(0, value - 1));
      }, 1000);

      return () => window.clearTimeout(countdownTimer);
    }

    const advanceTimer = window.setTimeout(() => {
      goToNextQuestion();
    }, 0);

    return () => window.clearTimeout(advanceTimer);
  }, [goToNextQuestion, hasStarted, isRevealed, nextQuestionCountdown]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasStarted || !currentQuestion) return;

      if (event.key >= "1" && event.key <= "4" && !isRevealed) {
        const optionIndex = Number(event.key) - 1;
        const option = currentOptions[optionIndex];
        if (option) onSelect(option);
      }
      if (event.key === "Enter" && isRevealed) {
        goToNextQuestion();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentOptions, currentQuestion, goToNextQuestion, hasStarted, isRevealed, onSelect]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const instant = searchParams.get("instant");
    if (hasStarted || instantStartedRef.current || (instant !== "1" && instant !== "true")) {
      return;
    }

    const categoryParam = searchParams.get("category");
    const difficultyParam = searchParams.get("difficulty") as Difficulty | null;
    const countParam = Number.parseInt(searchParams.get("count") ?? "", 10);

    const randomCategory = categoryParam ?? categoryMeta[Math.floor(Math.random() * categoryMeta.length)]?.name ?? "Science";
    const availableDifficulties = difficultyOptions.filter((difficulty) => unlockedDifficulties[difficulty]);
    const randomDifficulty = difficultyParam && unlockedDifficulties[difficultyParam] ? difficultyParam : availableDifficulties[Math.floor(Math.random() * availableDifficulties.length)] ?? "Easy";
    const quickQuestionCount = questionCountOptions.includes(countParam as (typeof questionCountOptions)[number]) ? countParam : 10;

    instantStartedRef.current = true;
    const launchTimer = window.setTimeout(() => {
        startQuizSession(randomCategory, randomDifficulty, quickQuestionCount);
      }, 0);

    return () => window.clearTimeout(launchTimer);
  }, [hasStarted, searchParams, startQuizSession, unlockedDifficulties]);

  useEffect(() => {
    if (!hasStarted) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    window.history.pushState({ quizGuard: true }, "", window.location.href);

    const onPopState = () => {
      if (bypassBackGuardRef.current) return;
      window.history.pushState({ quizGuard: true }, "", window.location.href);
      setPendingPath("__BACK__");
      setShowExitDialog(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const nextUrl = new URL(href, window.location.origin);
      if (nextUrl.pathname === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingPath(`${nextUrl.pathname}${nextUrl.search}`);
      setShowExitDialog(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [hasStarted, pathname]);

  const confirmExitQuiz = () => {
    if (!pendingPath) {
      setShowExitDialog(false);
      return;
    }

    setShowExitDialog(false);
    if (pendingPath === "__BACK__") {
      bypassBackGuardRef.current = true;
      window.history.back();
      return;
    }

    router.push(pendingPath);
  };

  const progress = hasStarted && quizQuestions.length ? ((currentIndex + (isRevealed ? 1 : 0)) / quizQuestions.length) * 100 : 0;
  const selectedMeta = categoryMeta.find((category) => category.name === selectedCategory) ?? null;
  const selectedInfo = selectedCategory ? categoryDescriptions[selectedCategory] : null;
  const timerValue = isRevealed ? nextQuestionCountdown : timeLeft;
  const timerTotal = isRevealed ? Math.max(1, nextQuestionDelaySeconds) : 15;

  return (
    <div className="h-screen overflow-hidden text-[var(--text-primary)]">
      <Sidebar />
      <TopBar title="Play Quiz" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`quiz-shell flex h-[calc(100vh-60px)] w-full flex-col px-2.5 pb-1.5 pt-1.5 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-4 ${
          hasStarted ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1040px] min-h-0 flex-1 flex-col items-center">
        {!hasStarted ? (
          <section className="quiz-setup glass mt-1 w-full rounded-card border border-violet-400/20 p-2 sm:p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">Ready to Play?</p>
                <h2 className="mt-0.5 font-sora text-sm font-bold text-[var(--text-primary)]">Select category, difficulty and question count</h2>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Category</p>
                <div className="quiz-category-grid grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                  {categoryMeta.map((category) => (
                    <CategoryCard
                      key={category.name}
                      iconName={category.iconName}
                      name={category.name}
                      difficulty={category.difficulty}
                      color={category.color}
                      active={selectedCategory === category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      hideDifficulty={true}
                      compact
                    />
                  ))}
                </div>
              </div>

              {selectedMeta && selectedInfo ? (
                <div className="rounded-card border border-violet-400/25 bg-violet-500/8 p-2.5">
                  <p className="font-sora text-sm font-semibold text-[var(--text-primary)]">{selectedMeta.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{selectedInfo.description}</p>

                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <div className="rounded-card border border-black/8 dark:border-white/10 bg-white/40 dark:bg-white/5 p-1.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Level</p>
                      <p className="font-sora text-sm font-bold text-[var(--text-primary)]">{effectiveDifficulty ?? "-"}</p>
                    </div>
                    <div className="rounded-card border border-black/8 dark:border-white/10 bg-white/40 dark:bg-white/5 p-1.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Questions</p>
                      <p className="font-sora text-sm font-bold text-[var(--text-primary)]">{selectedQuestionCount}</p>
                    </div>
                  </div>

                  <div ref={controlsRef} className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenu((prev) => (prev === "difficulty" ? null : "difficulty"))}
                        className="focus-ring flex w-full items-center justify-between rounded-card border border-violet-400/35 bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] dark:bg-white/5"
                      >
                        <span>{effectiveDifficulty ?? "Select Difficulty"}</span>
                        <ChevronDown className={`h-4 w-4 text-violet-400 transition-transform ${openMenu === "difficulty" ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {openMenu === "difficulty" ? (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="absolute bottom-full z-20 mb-2 w-full max-h-44 overflow-y-auto rounded-card border border-violet-400/35 bg-[var(--bg-secondary)]/95 p-1 backdrop-blur-md shadow-[0_14px_28px_rgba(124,58,237,0.25)]"
                          >
                            {difficultyOptions.map((difficulty) => (
                              (() => {
                                const unlocked = unlockedDifficulties[difficulty];

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
                                  "focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs",
                                  !unlocked ? "cursor-not-allowed opacity-55" : "",
                                  effectiveDifficulty === difficulty
                                    ? "bg-violet-500/25 text-violet-100"
                                    : "text-[var(--text-primary)] hover:bg-violet-500/12",
                                ].join(" ")}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  {difficulty}
                                  {!unlocked ? <Lock className="h-3 w-3" /> : null}
                                </span>
                                {effectiveDifficulty === difficulty ? <Check className="h-3.5 w-3.5" /> : null}
                              </button>
                                );
                              })()
                            ))}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenu((prev) => (prev === "questions" ? null : "questions"))}
                        className="focus-ring flex w-full items-center justify-between rounded-card border border-violet-400/35 bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] dark:bg-white/5"
                      >
                        <span>{selectedQuestionCount} Questions</span>
                        <ChevronDown className={`h-4 w-4 text-violet-400 transition-transform ${openMenu === "questions" ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {openMenu === "questions" ? (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="absolute bottom-full z-20 mb-2 w-full max-h-44 overflow-y-auto rounded-card border border-violet-400/35 bg-[var(--bg-secondary)]/95 p-1 backdrop-blur-md shadow-[0_14px_28px_rgba(124,58,237,0.25)]"
                          >
                            {questionCountOptions.map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => {
                                  setSelectedQuestionCount(count);
                                  setOpenMenu(null);
                                }}
                                className={[
                                  "focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs",
                                  selectedQuestionCount === count
                                    ? "bg-violet-500/25 text-violet-100"
                                    : "text-[var(--text-primary)] hover:bg-violet-500/12",
                                ].join(" ")}
                              >
                                <span className="inline-flex items-center gap-2">
                                  {count} Questions
                                  {passedQuestionCounts.has(count) ? <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-200">Passed</span> : null}
                                </span>
                                {selectedQuestionCount === count ? <Check className="h-3.5 w-3.5" /> : null}
                              </button>
                            ))}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                aria-label="Start quiz"
                onClick={handleStartClick}
                disabled={!selectedCategory || !effectiveDifficulty}
                className="focus-ring arcade-btn btn-primary sticky bottom-0 z-10 w-full inline-flex items-center justify-center gap-2 rounded-button px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Quiz <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : currentQuestion ? (
          <>
        <div className="quiz-meta mb-1 flex w-full flex-wrap items-center justify-center gap-1 text-xs">
          <div className="h-2 min-w-[140px] flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400" animate={{ width: `${progress}%` }} />
          </div>
          <span className="rounded-full border border-black/8 bg-white/70 px-2 py-0.5 text-xs text-[var(--text-primary)] shadow-sm dark:border-white/10 dark:bg-white/5">
            {currentIndex + 1}/{quizQuestions.length}
          </span>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-200">S {streak}</span>
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-200">P {points}</span>
          <Timer timeLeft={timerValue} total={timerTotal} />
        </div>

        <section className="quiz-question glass mb-1 w-full rounded-card p-2.5 text-center">
          <h2 className="font-sora text-sm font-semibold leading-snug sm:text-base">{currentQuestion.question}</h2>
        </section>

        <div className="quiz-options grid h-full max-h-[320px] w-full min-h-[160px] flex-1 auto-rows-fr gap-1 overflow-hidden sm:grid-cols-2">
          {currentOptions.map((option, index) => (
            <AnswerButton
              key={option}
              label={letters[index]}
              value={option}
              selected={selectedAnswer === option}
              revealed={isRevealed}
              isCorrect={currentQuestion.correctAnswer === option}
              disabled={isRevealed}
              onClick={() => onSelect(option)}
            />
          ))}
        </div>

        <div className="quiz-footer mt-0.5 flex w-full flex-col gap-1">
          <AnimatePresence mode="wait" initial={false}>
            {feedback ? (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`quiz-feedback flex-1 rounded-card border overflow-hidden p-2 text-[10px] leading-tight ${
                  feedback.status === "correct"
                    ? "border-green-400/35 bg-green-500/10 text-green-800 dark:text-green-200"
                    : "border-red-400/35 bg-red-500/10 text-red-800 dark:text-red-200"
                }`}
              >
                <div className="font-medium mb-0.5">
                  {feedback.status === "correct" ? "✓ Correct!" : "✗ Incorrect"}
                </div>
                <div className="opacity-90">{feedback.text}</div>
              </motion.div>
            ) : (
              <div key="placeholder" className="quiz-feedback-placeholder flex-1 rounded-card border border-transparent p-2" aria-hidden="true" />
            )}
          </AnimatePresence>

          {isRevealed ? (
            <div className="quiz-next rounded-button border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-center text-xs font-medium text-violet-700 dark:text-violet-200">
              Next question in {Math.max(0, nextQuestionCountdown)}s...
            </div>
          ) : null}
        </div>
          </>
        ) : (
          <section className="glass mt-4 w-full rounded-card border border-violet-400/20 p-4 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No quiz questions were loaded. Please go back and pick another category and difficulty.</p>
          </section>
        )}
        </div>

        <ProgressionInfoDialog
          isOpen={showProgressionDialog}
          categoryName={selectedCategory ?? "Selected Category"}
          easyPassed={easyPassedCount}
          mediumPassed={mediumPassedCount}
          hardPassed={hardPassedCount}
          onCancel={() => setShowProgressionDialog(false)}
          onConfirm={handleConfirmProgressionDialog}
        />

        <AnimatePresence>
          {showExitDialog ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                className="glass w-full max-w-md rounded-card border border-violet-400/25 bg-white/90 p-5 dark:bg-slate-900/90"
              >
                <h3 className="font-sora text-lg font-bold text-[var(--text-primary)]">Exit Quiz?</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  You have an active quiz session. Do you want to leave this quiz?
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPath(null);
                      setShowExitDialog(false);
                    }}
                    className="focus-ring rounded-button border border-black/10 bg-white/70 px-3 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5"
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    onClick={confirmExitQuiz}
                    className="focus-ring rounded-button border border-rose-400/40 bg-rose-500/18 px-4 py-2 text-sm font-semibold text-rose-700 dark:text-rose-200"
                  >
                    Exit Quiz
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, LoaderCircle, Image, CircleCheck, Type, Flame, BookOpen, Sparkles, Radar, Crown, Clock3, Target, AlertTriangle } from "lucide-react";
import CategoryCard from "@/components/CategoryCard";
import ProfilePhoto from "@/components/ProfilePhoto";
import { categoryMeta, currentUser, leaderboardUsers, questions } from "@/lib/mockData";
import type { BattleState } from "@/lib/types";
import AnswerButton from "@/components/AnswerButton";
import Timer from "@/components/Timer";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { useProfileStore } from "@/lib/profileStore";
import { loadBattleOpponentsFromSupabase, persistBattleSessionToSupabase } from "@/lib/supabase/battlePersistence";
import { cx } from "@/lib/utils";

const letters = ["A", "B", "C", "D"];
const RANDOM_CATEGORY_ID = "__random__";

type BattleModeId = "classic" | "pics-word" | "true-false" | "guess-word" | "rapid-fire";

interface BattleMode {
  id: BattleModeId;
  label: string;
  icon: typeof BookOpen;
  description: string;
  rounds: number;
  secondsPerRound: number;
}

interface PreparedBattleQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface BattleSetupResult {
  questions: PreparedBattleQuestion[];
  resolvedCategoryName: string;
}

interface BattleRoundResult {
  id: number;
  round: number;
  question: string;
  correctAnswer: string;
  userAnswer: string | null;
  userCorrect: boolean;
  userTimeSpent: number;
  userPoints: number;
  userStreakAfter: number;
  opponentAnswer: string | null;
  opponentCorrect: boolean;
  opponentTimeSpent: number;
  opponentPoints: number;
  opponentStreakAfter: number;
}

interface RoundBurst {
  userPoints: number;
  opponentPoints: number;
  userMultiplier: number;
  opponentMultiplier: number;
}

interface ScoreToast {
  id: number;
  title: string;
  speedBonus: number;
  streakBonus: number;
  totalPoints: number;
}

interface BattleOpponent {
  username: string;
  rank: string;
  photo: {
    type: "initials" | "icon" | "image";
    value: string;
  };
}

const battleModes: BattleMode[] = [
  {
    id: "classic",
    label: "Classic Quiz",
    icon: BookOpen,
    description: "Balanced 1v1 with standard timer and rounds.",
    rounds: 5,
    secondsPerRound: 12,
  },
  {
    id: "pics-word",
    label: "4 Pics 1 Word",
    icon: Image,
    description: "Visual clue style pacing with longer read time.",
    rounds: 4,
    secondsPerRound: 14,
  },
  {
    id: "true-false",
    label: "True or False",
    icon: CircleCheck,
    description: "Fast verdict rounds with binary choices.",
    rounds: 6,
    secondsPerRound: 8,
  },
  {
    id: "guess-word",
    label: "Guess the Word",
    icon: Type,
    description: "Interpret clue-heavy prompts under pressure.",
    rounds: 5,
    secondsPerRound: 10,
  },
  {
    id: "rapid-fire",
    label: "Rapid Fire",
    icon: Flame,
    description: "Maximum speed mode with minimal thinking time.",
    rounds: 7,
    secondsPerRound: 6,
  },
];

const shuffleArray = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getBattlePoints = (timeSpent: number, streakAfter: number, totalSeconds: number) => {
  const safeTotal = Math.max(1, totalSeconds);
  const safeTimeSpent = Math.max(0, Math.min(safeTotal, timeSpent));
  const speedScore = Math.max(0, Math.round(((safeTotal - safeTimeSpent) / safeTotal) * 80));
  const streakMultiplier = 1 + Math.min(1.65, Math.max(0, streakAfter - 1) * 0.18);
  const basePoints = 100 + speedScore;

  return {
    points: Math.max(0, Math.round(basePoints * streakMultiplier)),
    speedScore,
    streakMultiplier: Number(streakMultiplier.toFixed(2)),
  };
};

const getOpponentTimeSpent = (totalSeconds: number) => {
  const safeTotal = Math.max(2, totalSeconds);
  const lower = Math.max(1, Math.floor(safeTotal * 0.22));
  const upper = Math.max(lower + 1, Math.floor(safeTotal * 0.88));
  return Math.min(safeTotal - 1, Math.max(1, Math.floor(lower + Math.random() * (upper - lower))));
};

const toTrueFalseQuestion = (question: PreparedBattleQuestion): PreparedBattleQuestion => {
  const incorrectOption = question.options.find((option) => option !== question.correctAnswer) ?? question.correctAnswer;
  const showsCorrectAnswer = Math.random() > 0.5;
  const displayedAnswer = showsCorrectAnswer ? question.correctAnswer : incorrectOption;

  return {
    question: `${question.question} Answer: ${displayedAnswer}`,
    options: ["True", "False"],
    correctAnswer: showsCorrectAnswer ? "True" : "False",
  };
};

const buildBattleQuestions = (categoryName: string, modeId: BattleModeId): BattleSetupResult => {
  const resolvedCategoryName = categoryName === RANDOM_CATEGORY_ID
    ? categoryMeta[Math.floor(Math.random() * categoryMeta.length)]?.name
    : categoryName;
  const selectedCategory = categoryMeta.find((category) => category.name === resolvedCategoryName);
  const selectedMode = battleModes.find((mode) => mode.id === modeId);

  if (!selectedCategory || !selectedMode) return { questions: [], resolvedCategoryName: resolvedCategoryName ?? "Random" };

  const categoryPool = questions.filter((question) => question.category === selectedCategory.name);
  const fallbackPool = categoryPool.length ? categoryPool : questions;
  const picked = shuffleArray(fallbackPool).slice(0, selectedMode.rounds);

  const preparedQuestions = picked.map((question) => {
    const base: PreparedBattleQuestion = {
      question:
        modeId === "pics-word"
          ? `4 Pics 1 Word: ${question.question}`
          : modeId === "guess-word"
            ? `Guess the Word: ${question.question}`
            : question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
    };

    if (modeId === "true-false") {
      return toTrueFalseQuestion(base);
    }

    return base;
  });

  return { questions: preparedQuestions, resolvedCategoryName: selectedCategory.name };
};

export default function BattleArena() {
  const { photo: profilePhoto } = useProfilePhotoStore();
  const { displayName, tier } = useProfileStore();

  const [state, setState] = useState<BattleState>("idle");
  const [setupTab, setSetupTab] = useState<"mode" | "category">("mode");
  const [countdown, setCountdown] = useState(5);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [resolvingRound, setResolvingRound] = useState(false);
  const [youScore, setYouScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [youCorrectCount, setYouCorrectCount] = useState(0);
  const [opponentCorrectCount, setOpponentCorrectCount] = useState(0);
  const [youStreak, setYouStreak] = useState(0);
  const [opponentStreak, setOpponentStreak] = useState(0);
  const [bestYouStreak, setBestYouStreak] = useState(0);
  const [bestOpponentStreak, setBestOpponentStreak] = useState(0);
  const [roundResults, setRoundResults] = useState<BattleRoundResult[]>([]);
  const [roundBurst, setRoundBurst] = useState<RoundBurst | null>(null);
  const [scoreToasts, setScoreToasts] = useState<ScoreToast[]>([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(12);
  const [selectedMode, setSelectedMode] = useState<BattleModeId | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [resolvedCategoryName, setResolvedCategoryName] = useState<string | null>(null);
  const [battleQuestions, setBattleQuestions] = useState<PreparedBattleQuestion[]>([]);
  const [matchedOpponent, setMatchedOpponent] = useState<BattleOpponent>({
    username: "RogueNeuron",
    rank: "Pro",
    photo: { type: "initials", value: "RN" },
  });

  const persistedBattleKeyRef = useRef<string | null>(null);
  const roundResultIdRef = useRef(1);
  const scoreToastIdRef = useRef(1);
  const arenaRef = useRef<HTMLElement | null>(null);
  const forfeitRecordedRef = useRef(false);

  const activeMode = useMemo(
    () => battleModes.find((mode) => mode.id === selectedMode) ?? null,
    [selectedMode]
  );

  const activeCategory = useMemo(() => categoryMeta.find((category) => category.name === selectedCategory) ?? null, [selectedCategory]);
  const selectedCategoryLabel = selectedCategory === RANDOM_CATEGORY_ID ? "Random" : activeCategory?.name ?? null;
  const battleCategoryLabel = selectedCategory === RANDOM_CATEGORY_ID ? `Random • ${resolvedCategoryName ?? "Picking category..."}` : resolvedCategoryName ?? activeCategory?.name ?? null;
  const isBattleOngoing = state === "searching" || state === "found" || state === "countdown" || state === "playing";

  const question = battleQuestions[index];

  const battleSummary = useMemo(() => {
    const totalRounds = roundResults.length || 1;
    const userAverageTime = roundResults.length ? roundResults.reduce((sum, round) => sum + round.userTimeSpent, 0) / roundResults.length : 0;
    const opponentAverageTime = roundResults.length ? roundResults.reduce((sum, round) => sum + round.opponentTimeSpent, 0) / roundResults.length : 0;
    const bestRound = roundResults.reduce<BattleRoundResult | null>((best, round) => {
      if (!best) return round;
      return round.userPoints + round.opponentPoints > best.userPoints + best.opponentPoints ? round : best;
    }, null);

    return {
      totalRounds: roundResults.length,
      userAccuracy: roundResults.length ? Math.round((youCorrectCount / roundResults.length) * 100) : 0,
      opponentAccuracy: roundResults.length ? Math.round((opponentCorrectCount / roundResults.length) * 100) : 0,
      userAverageTime: Number(userAverageTime.toFixed(1)),
      opponentAverageTime: Number(opponentAverageTime.toFixed(1)),
      bestRound,
      margin: Math.abs(youScore - opponentScore),
      winner: youScore === opponentScore ? "draw" : youScore > opponentScore ? "you" : "opponent",
      winningScore: Math.max(youScore, opponentScore),
      losingScore: Math.min(youScore, opponentScore),
      roundProgress: Math.round((roundResults.length / Math.max(1, battleQuestions.length)) * 100),
      averagePointsPerRound: roundResults.length ? Math.round((youScore + opponentScore) / roundResults.length) : 0,
      totalRoundsLabel: `${roundResults.length}/${battleQuestions.length || totalRounds}`,
    };
  }, [battleQuestions.length, opponentCorrectCount, opponentScore, roundResults, youCorrectCount, youScore]);

  const pickFallbackOpponent = useCallback((): BattleOpponent => {
    const candidateOpponents = leaderboardUsers.filter((user) => user.id !== currentUser.id);
    const randomOpponent = candidateOpponents[Math.floor(Math.random() * candidateOpponents.length)];

    if (!randomOpponent) {
      return {
        username: "RogueNeuron",
        rank: "Pro",
        photo: { type: "initials", value: "RN" },
      };
    }

    return {
      username: randomOpponent.username,
      rank: randomOpponent.tier,
      photo: { type: "initials", value: randomOpponent.avatar },
    };
  }, []);

  const pickOpponent = useCallback(async (): Promise<BattleOpponent> => {
    const supabaseOpponents = await loadBattleOpponentsFromSupabase();
    if (!supabaseOpponents.length) return pickFallbackOpponent();

    const randomOpponent = supabaseOpponents[Math.floor(Math.random() * supabaseOpponents.length)];
    if (!randomOpponent) return pickFallbackOpponent();

    return {
      username: randomOpponent.username,
      rank: randomOpponent.tier,
      photo: randomOpponent.photo,
    };
  }, [pickFallbackOpponent]);

  const persistForfeitResult = useCallback(() => {
    if (forfeitRecordedRef.current || !selectedMode) return;
    forfeitRecordedRef.current = true;

    const forfeitOpponentScore = Math.max(opponentScore + 160, youScore + 120);
    void persistBattleSessionToSupabase({
      mode: selectedMode,
      category: battleCategoryLabel ?? selectedCategoryLabel ?? selectedCategory ?? "Unknown",
      result: "loss",
      userScore: youScore,
      opponentScore: forfeitOpponentScore,
      opponentName: matchedOpponent.username,
    });
  }, [battleCategoryLabel, matchedOpponent.username, opponentScore, selectedCategory, selectedCategoryLabel, selectedMode, youScore]);

  const confirmLeaveBattle = () => {
    persistForfeitResult();
    const href = pendingLeaveHref;
    setShowLeaveConfirm(false);
    setPendingLeaveHref(null);

    if (href) {
      window.location.assign(href);
      return;
    }

    resetToSetup();
  };

  const stayInBattle = () => {
    setShowLeaveConfirm(false);
    setPendingLeaveHref(null);
  };

  const advanceRound = useCallback(() => {
    if (index >= battleQuestions.length - 1) {
      setState("finished");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setResolvingRound(false);
    setRoundBurst(null);
    setTimeLeft(activeMode?.secondsPerRound ?? 12);
  }, [activeMode?.secondsPerRound, battleQuestions.length, index]);

  const finishBattle = useCallback(() => {
    setState("finished");
  }, []);

  const resolveRound = useCallback(
    (userAnswer: string | null, userTimeSpent: number, timedOut = false) => {
      if (!question || resolvingRound) return;

      const totalSeconds = activeMode?.secondsPerRound ?? 12;
      const userCorrect = userAnswer === question.correctAnswer;
      const nextYouStreak = userCorrect ? youStreak + 1 : 0;
      const userCalc = userCorrect
        ? getBattlePoints(userTimeSpent, nextYouStreak, totalSeconds)
        : { points: 0, speedScore: 0, streakMultiplier: 1 };
      const userPoints = userCalc.points;

      const opponentCorrect = Math.random() > 0.35;
      const opponentTimeSpent = opponentCorrect ? getOpponentTimeSpent(totalSeconds) : totalSeconds;
      const nextOpponentStreak = opponentCorrect ? opponentStreak + 1 : 0;
      const opponentCalc = opponentCorrect
        ? getBattlePoints(opponentTimeSpent, nextOpponentStreak, totalSeconds)
        : { points: 0, speedScore: 0, streakMultiplier: 1 };
      const opponentPoints = opponentCalc.points;

      setResolvingRound(true);
      setRevealed(true);
      setRoundBurst({
        userPoints,
        opponentPoints,
        userMultiplier: userCalc.streakMultiplier,
        opponentMultiplier: opponentCalc.streakMultiplier,
      });

      if (userCorrect) {
        const basePlusSpeed = 100 + userCalc.speedScore;
        const streakBonus = Math.max(0, userPoints - basePlusSpeed);
        const toastId = scoreToastIdRef.current;
        scoreToastIdRef.current += 1;

        setScoreToasts((toasts) => [
          ...toasts,
          {
            id: toastId,
            title: `Round ${index + 1} Score Breakdown`,
            speedBonus: userCalc.speedScore,
            streakBonus,
            totalPoints: userPoints,
          },
        ]);

        window.setTimeout(() => {
          setScoreToasts((toasts) => toasts.filter((toast) => toast.id !== toastId));
        }, 2200);
      }

      setYouScore((score) => score + userPoints);
      setOpponentScore((score) => score + opponentPoints);
      setYouCorrectCount((count) => count + (userCorrect ? 1 : 0));
      setOpponentCorrectCount((count) => count + (opponentCorrect ? 1 : 0));
      setYouStreak(nextYouStreak);
      setOpponentStreak(nextOpponentStreak);
      setBestYouStreak((best) => Math.max(best, nextYouStreak));
      setBestOpponentStreak((best) => Math.max(best, nextOpponentStreak));
      setRoundResults((results) => [
        ...results,
        {
          id: roundResultIdRef.current++,
          round: index + 1,
          question: question.question,
          correctAnswer: question.correctAnswer,
          userAnswer,
          userCorrect,
          userTimeSpent,
          userPoints,
          userStreakAfter: nextYouStreak,
          opponentAnswer: opponentCorrect ? question.correctAnswer : null,
          opponentCorrect,
          opponentTimeSpent,
          opponentPoints,
          opponentStreakAfter: nextOpponentStreak,
        },
      ]);

      const shouldAdvance = index < battleQuestions.length - 1;
      setTimeout(() => {
        if (shouldAdvance) {
          advanceRound();
          return;
        }
        finishBattle();
      }, timedOut ? 500 : 650);
    },
    [activeMode?.secondsPerRound, advanceRound, battleQuestions.length, finishBattle, index, opponentStreak, question, resolvingRound, youStreak]
  );

  useEffect(() => {
    if (!isBattleOngoing) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isBattleOngoing]);

  useEffect(() => {
    if (!isBattleOngoing) return;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      const insideArena = arenaRef.current?.contains(anchor);
      if (insideArena) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingLeaveHref(anchor.href);
      setShowLeaveConfirm(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isBattleOngoing]);

  useEffect(() => {
    if (state !== "searching") return;
    const timer = setTimeout(() => {
      setCountdown(5);
      setState("found");
    }, 1800);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state !== "found") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setState("playing");
          setTimeLeft(activeMode?.secondsPerRound ?? 12);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMode?.secondsPerRound, state]);

  useEffect(() => {
    if (state !== "playing" || revealed || resolvingRound || !battleQuestions.length) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimeout(() => resolveRound(null, activeMode?.secondsPerRound ?? 12, true), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMode?.secondsPerRound, battleQuestions.length, revealed, resolveRound, resolvingRound, state]);

  const startSearch = () => {
    if (!selectedMode || !selectedCategory) return;
    const prepared = buildBattleQuestions(selectedCategory, selectedMode);
    if (!prepared.questions.length) return;

    const mode = battleModes.find((item) => item.id === selectedMode);

    setBattleQuestions(prepared.questions);
    setResolvedCategoryName(prepared.resolvedCategoryName);
    setState("searching");
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setResolvingRound(false);
    setYouScore(0);
    setOpponentScore(0);
    setYouCorrectCount(0);
    setOpponentCorrectCount(0);
    setYouStreak(0);
    setOpponentStreak(0);
    setBestYouStreak(0);
    setBestOpponentStreak(0);
    setRoundResults([]);
    setRoundBurst(null);
    setScoreToasts([]);
    setShowLeaveConfirm(false);
    setPendingLeaveHref(null);
    forfeitRecordedRef.current = false;
    setTimeLeft(mode?.secondsPerRound ?? 12);
    setCountdown(5);
    void pickOpponent().then((opponent) => setMatchedOpponent(opponent));
  };

  const resetToSetup = () => {
    setState("idle");
    setSetupTab("mode");
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setResolvingRound(false);
    setYouScore(0);
    setOpponentScore(0);
    setYouCorrectCount(0);
    setOpponentCorrectCount(0);
    setYouStreak(0);
    setOpponentStreak(0);
    setBestYouStreak(0);
    setBestOpponentStreak(0);
    setRoundResults([]);
    setRoundBurst(null);
    setScoreToasts([]);
    setResolvedCategoryName(null);
    setShowLeaveConfirm(false);
    setPendingLeaveHref(null);
    forfeitRecordedRef.current = false;
  };

  useEffect(() => {
    if (state !== "finished" || !selectedMode || !selectedCategory) return;

    const playedCategory = battleCategoryLabel ?? selectedCategoryLabel ?? selectedCategory;
    const battleKey = `${selectedMode}:${playedCategory}:${youScore}:${opponentScore}:${battleQuestions.length}:${matchedOpponent.username}`;
    if (persistedBattleKeyRef.current === battleKey) return;
    persistedBattleKeyRef.current = battleKey;

    const result = youScore > opponentScore ? "win" : youScore < opponentScore ? "loss" : "draw";
    void persistBattleSessionToSupabase({
      mode: selectedMode,
      category: playedCategory,
      result,
      userScore: youScore,
      opponentScore,
      opponentName: matchedOpponent.username,
    });
  }, [battleCategoryLabel, battleQuestions.length, matchedOpponent.username, opponentScore, selectedCategory, selectedCategoryLabel, selectedMode, state, youScore]);

  const chooseAnswer = (value: string) => {
    if (revealed || state !== "playing" || !question) return;
    setSelected(value);
    setResolvingRound(true);
    const totalSeconds = activeMode?.secondsPerRound ?? 12;
    const userTimeSpent = Math.max(0, totalSeconds - timeLeft);
    setTimeout(() => resolveRound(value, userTimeSpent, false), 450);
  };

  return (
    <section ref={arenaRef} className="quiz-shell relative overflow-hidden rounded-[28px] border border-black/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.7),rgba(255,255,255,0.42))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(15,23,42,0.45))] dark:shadow-[0_26px_68px_rgba(2,8,25,0.52)] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-500/25" />
      <div className="pointer-events-none absolute -bottom-16 left-12 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-400/20" />
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-[1] space-y-5">
            <div className="grid gap-4 rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur md:grid-cols-[1fr_auto] dark:border-white/10 dark:bg-slate-900/42">
              <div>
                <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
                  <Radar className="h-3.5 w-3.5" /> 1v1 Match Configuration
                </p>
                <h2 className="font-sora text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Build Your Duel</h2>
                <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">
                  Choose a mode first, then move to the category tab and finalize your battle setup.
                </p>
              </div>
              <div className="grid min-w-[200px] gap-2 self-start text-sm">
                <div className="rounded-card border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[var(--text-muted)]">Mode</p>
                  <p className="font-semibold text-[var(--text-primary)]">{activeMode?.label ?? "Not selected"}</p>
                </div>
                <div className="rounded-card border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[var(--text-muted)]">Category</p>
                  <p className="font-semibold text-[var(--text-primary)]">{selectedCategoryLabel ?? "Not selected"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/42">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  aria-label="Mode setup tab"
                  onClick={() => setSetupTab("mode")}
                  className={cx(
                    "focus-ring rounded-button border px-4 py-2 text-sm font-semibold",
                    setupTab === "mode"
                      ? "border-violet-400/45 bg-violet-500/12 text-violet-700 dark:text-violet-200"
                      : "border-black/10 bg-white/50 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5"
                  )}
                >
                  1. Select Mode
                </button>
                <button
                  type="button"
                  aria-label="Category setup tab"
                  onClick={() => selectedMode && setSetupTab("category")}
                  disabled={!selectedMode}
                  className={cx(
                    "focus-ring rounded-button border px-4 py-2 text-sm font-semibold",
                    setupTab === "category"
                      ? "border-cyan-400/45 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200"
                      : "border-black/10 bg-white/50 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5",
                    !selectedMode && "cursor-not-allowed opacity-55"
                  )}
                >
                  2. Choose Category
                </button>
              </div>

              {setupTab === "mode" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {battleModes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = selectedMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        aria-label={`Select ${mode.label}`}
                        onClick={() => {
                          setSelectedMode(mode.id);
                          setSetupTab("category");
                        }}
                        className={cx(
                          "focus-ring arcade-btn group rounded-[18px] border p-3.5 text-left",
                          isActive
                            ? "border-violet-400/50 bg-violet-500/14 shadow-[0_10px_22px_rgba(124,58,237,0.2)]"
                            : "border-black/10 bg-white/65 hover:-translate-y-0.5 hover:border-violet-300 dark:border-white/10 dark:bg-white/5"
                        )}
                      >
                        <p className="mb-1 inline-flex items-center gap-2 font-sora text-base font-semibold text-[var(--text-primary)]">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/12 text-violet-600 dark:text-violet-200">
                            <Icon className="h-4 w-4" />
                          </span>
                          {mode.label}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{mode.description}</p>
                        <div className="mt-2 flex gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          <span>{mode.rounds} rounds</span>
                          <span>•</span>
                          <span>{mode.secondsPerRound}s each</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                    <Sparkles className="h-4 w-4 text-cyan-500" /> {activeMode?.label ?? "Selected mode"} • Choose category
                  </p>
                  <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <button
                      type="button"
                      aria-label="Select Random category"
                      onClick={() => setSelectedCategory(RANDOM_CATEGORY_ID)}
                      className={cx(
                        "focus-ring arcade-btn relative overflow-hidden rounded-[18px] border p-2.5 text-left",
                        selectedCategory === RANDOM_CATEGORY_ID
                          ? "border-cyan-400/60 bg-cyan-500/12 shadow-[0_10px_22px_rgba(34,211,238,0.18)]"
                          : "border-black/10 bg-white/65 hover:-translate-y-0.5 hover:border-cyan-300 dark:border-white/10 dark:bg-white/5"
                      )}
                    >
                      <div className="absolute right-3 top-3 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                        Mix
                      </div>
                      <div className="mb-2 flex items-center justify-between pr-12">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-500/15 text-cyan-300">
                          <Sparkles className="h-4 w-4" />
                        </span>
                      </div>
                      <h3 className="mb-1 font-sora text-lg font-semibold text-[var(--text-primary)]">Random</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Auto-picks a dashboard category for each battle.</p>
                    </button>
                    {categoryMeta.map((category) => (
                      <CategoryCard
                        key={category.name}
                        iconName={category.iconName}
                        name={category.name}
                        difficulty={category.difficulty}
                        color={category.color}
                        active={selectedCategory === category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        hideDifficulty
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid grid-cols-3 items-center text-center">
                  <div className="grid gap-1">
                    <ProfilePhoto
                      photo={profilePhoto}
                      fallbackText={displayName}
                      className="mx-auto h-11 w-11 border-violet-400/40"
                    />
                    <span className="text-xs text-[var(--text-secondary)]">{displayName}</span>
                  </div>
                  <span className="font-sora text-2xl font-bold text-violet-500">VS</span>
                  <div className="grid gap-1">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-orange-400/45 bg-orange-500/16 font-semibold text-orange-700 dark:text-orange-200">?</span>
                    <span className="text-xs text-[var(--text-secondary)]">Opponent</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Find opponent"
                  onClick={startSearch}
                  disabled={!selectedMode || !selectedCategory}
                  className={cx(
                    "focus-ring arcade-btn btn-success inline-flex w-full items-center justify-center gap-2 rounded-button px-5 py-3 text-sm font-semibold sm:w-auto",
                    (!selectedMode || !selectedCategory) && "cursor-not-allowed opacity-55"
                  )}
                >
                  <Swords className="h-4 w-4" /> Find Opponent
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {state === "searching" && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] grid place-items-center gap-4 py-12 text-center">
            <LoaderCircle className="h-10 w-10 animate-spin text-violet-300" />
            <p className="font-sora text-xl text-[var(--text-primary)]">Finding opponent...</p>
            <p className="text-sm text-[var(--text-secondary)]">Matching you with a player near your skill tier</p>
            {activeMode && selectedCategoryLabel && (
              <p className="text-xs text-[var(--text-muted)]">
                {activeMode.label} • {selectedCategoryLabel}
              </p>
            )}
            <button
              type="button"
              aria-label="Cancel matchmaking"
              onClick={resetToSetup}
              className="focus-ring arcade-btn rounded-button border border-black/8 px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-red-400 hover:text-red-700 dark:border-white/15 dark:text-white/75 dark:hover:text-red-200"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {state === "found" && (
          <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] py-4">
            <div className="quiz-meta grid grid-cols-3 items-center gap-4 text-center">
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-card border border-violet-400/25 bg-violet-500/10 p-4">
                <ProfilePhoto
                  photo={profilePhoto}
                  fallbackText={displayName}
                  className="mx-auto mb-2 h-12 w-12 border-violet-400/40"
                />
                <p className="text-[var(--text-primary)]">{displayName}</p>
                <p className="text-xs text-[var(--text-secondary)]">{tier}</p>
              </motion.div>
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-sora text-3xl font-bold text-violet-300">
                VS
              </motion.div>
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-card border border-orange-400/25 bg-orange-500/10 p-4">
                <ProfilePhoto
                  photo={matchedOpponent.photo}
                  fallbackText={matchedOpponent.username}
                  className="mx-auto mb-2 h-12 w-12 border-orange-400/40"
                />
                <p className="text-[var(--text-primary)]">{matchedOpponent.username}</p>
                <p className="text-xs text-[var(--text-secondary)]">{matchedOpponent.rank}</p>
              </motion.div>
            </div>
            <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
              {activeMode?.label} • {selectedCategoryLabel}
            </p>
            <p className="mt-1 text-center text-xs text-cyan-300/90 dark:text-cyan-200/90">
              {selectedCategory === RANDOM_CATEGORY_ID
                ? `Random picked: ${resolvedCategoryName ?? "Loading..."}`
                : `Category locked: ${resolvedCategoryName ?? activeCategory?.name ?? "Loading..."}`}
            </p>
            <div className="mt-5 flex justify-center">
              <div className="glass inline-flex items-center gap-3 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm text-[var(--text-primary)]">
                <span className="font-semibold text-cyan-200">Auto-start</span>
                <span className="text-[var(--text-secondary)]">Match begins in {countdown}s</span>
              </div>
            </div>
          </motion.div>
        )}

        {state === "countdown" && (
          <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] grid place-items-center gap-3 py-12 text-center">
            <p className="font-sora text-lg text-[var(--text-secondary)]">Get ready...</p>
            <p className="font-sora text-6xl font-bold text-[var(--text-primary)]">{countdown}</p>
            <p className="text-sm text-[var(--text-muted)]">Battle starts now</p>
          </motion.div>
        )}

        {state === "playing" && question && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] quiz-shell">
            {(() => {
              const maxBattlePoints = Math.max(1, battleQuestions.length * 250);

              return (
            <div className="quiz-meta mb-3 grid gap-3 sm:grid-cols-[1fr_56px_1fr] sm:items-center">
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="h-2 rounded-full bg-violet-400" style={{ width: `${(youScore / maxBattlePoints) * 100}%` }} />
              </div>
              <Timer timeLeft={timeLeft} total={activeMode?.secondsPerRound ?? 12} />
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="ml-auto h-2 rounded-full bg-orange-400" style={{ width: `${(opponentScore / maxBattlePoints) * 100}%` }} />
              </div>
            </div>
              );
            })()}

            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-[16px] border border-violet-400/25 bg-gradient-to-br from-violet-500/14 via-violet-500/8 to-transparent p-3 text-left">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">You</p>
                <motion.p
                  key={`you-${youScore}`}
                  initial={{ opacity: 0.45, scale: 0.84, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="font-sora text-2xl font-bold text-[var(--text-primary)]"
                >
                  {youScore}
                </motion.p>
                <AnimatePresence>
                  {revealed && roundBurst && roundBurst.userPoints > 0 ? (
                    <motion.div
                      key={`burst-you-${index}-${youScore}`}
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="pointer-events-none absolute right-3 top-3 rounded-full border border-emerald-400/40 bg-emerald-500/14 px-2.5 py-1 text-[11px] font-semibold text-emerald-100"
                    >
                      +{roundBurst.userPoints}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>Streak x{youStreak}</span>
                  <AnimatePresence>
                    {revealed && roundBurst && roundBurst.userPoints > 0 ? (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2 py-0.5 font-semibold text-emerald-200"
                      >
                        +{roundBurst.userPoints} x{roundBurst.userMultiplier}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[16px] border border-orange-400/25 bg-gradient-to-br from-orange-500/14 via-orange-500/8 to-transparent p-3 text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Opponent</p>
                <motion.p
                  key={`opp-${opponentScore}`}
                  initial={{ opacity: 0.45, scale: 0.84, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="font-sora text-2xl font-bold text-[var(--text-primary)]"
                >
                  {opponentScore}
                </motion.p>
                <AnimatePresence>
                  {revealed && roundBurst && roundBurst.opponentPoints > 0 ? (
                    <motion.div
                      key={`burst-opp-${index}-${opponentScore}`}
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="pointer-events-none absolute right-3 top-3 rounded-full border border-orange-400/40 bg-orange-500/14 px-2.5 py-1 text-[11px] font-semibold text-orange-50"
                    >
                      +{roundBurst.opponentPoints}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)] sm:justify-end">
                  <span>Streak x{opponentStreak}</span>
                  <AnimatePresence>
                    {revealed && roundBurst && roundBurst.opponentPoints > 0 ? (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-full border border-orange-400/35 bg-orange-500/12 px-2 py-0.5 font-semibold text-orange-100"
                      >
                        +{roundBurst.opponentPoints} x{roundBurst.opponentMultiplier}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="quiz-question glass mb-3 rounded-card p-4 text-center">
              <p className="mb-2 text-xs text-violet-700 dark:text-violet-200">Round {index + 1} / {battleQuestions.length}</p>
              <p className="font-sora text-[1.5rem] font-semibold text-[var(--text-primary)] sm:text-[1.7rem]">{question.question}</p>
            </div>

            <div className={cx("quiz-options grid gap-2.5", question.options.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-1 sm:max-w-md sm:mx-auto")}>
              {question.options.map((opt, i) => (
                <AnswerButton
                  key={opt}
                  label={letters[i]}
                  value={opt}
                  selected={selected === opt}
                  revealed={revealed}
                  isCorrect={question.correctAnswer === opt}
                  onClick={() => chooseAnswer(opt)}
                />
              ))}
            </div>

            <div className="pointer-events-none absolute right-3 top-2 z-20 flex max-w-[320px] flex-col gap-2">
              <AnimatePresence>
                {scoreToasts.map((toast) => (
                  <motion.article
                    key={toast.id}
                    initial={{ opacity: 0, x: 20, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 16, y: -14, scale: 0.95 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="rounded-[14px] border border-emerald-400/35 bg-emerald-500/14 p-3 shadow-[0_10px_24px_rgba(16,185,129,0.25)] backdrop-blur"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">{toast.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-emerald-50">
                      <span className="rounded-full border border-emerald-200/35 bg-emerald-200/14 px-2 py-0.5">Speed +{toast.speedBonus}</span>
                      <span className="rounded-full border border-emerald-200/35 bg-emerald-200/14 px-2 py-0.5">Streak +{toast.streakBonus}</span>
                      <span className="rounded-full border border-white/25 bg-white/10 px-2 py-0.5 font-semibold">Total +{toast.totalPoints}</span>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {state === "finished" && (
          <motion.div key="finished" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1] space-y-4">
            <section className={cx(
              "overflow-hidden rounded-[24px] border p-5 shadow-[0_18px_42px_rgba(15,23,42,0.18)] backdrop-blur-xl",
              battleSummary.winner === "you"
                ? "border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-500/10"
                : battleSummary.winner === "opponent"
                  ? "border-rose-400/30 bg-rose-500/10 dark:bg-rose-500/10"
                  : "border-amber-400/30 bg-amber-500/10 dark:bg-amber-500/10"
            )}>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:text-white/70">
                    <Crown className="h-3.5 w-3.5 text-violet-200" /> Match Complete
                  </p>
                  <h2 className="font-sora text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                    {battleSummary.winner === "you" ? "Victory" : battleSummary.winner === "opponent" ? "Defeat" : "Draw"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
                    {selectedMode ? `${battleModes.find((mode) => mode.id === selectedMode)?.label ?? "Battle"} • ` : ""}
                    {battleCategoryLabel ?? selectedCategoryLabel ?? "Selected category"}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Winner is determined by the total score gathered across the match. Faster answers and longer streaks earn more points.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-[18px] border border-white/15 bg-white/8 p-4 text-center shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Winner</p>
                    <p className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">
                      {battleSummary.winner === "you" ? displayName : battleSummary.winner === "opponent" ? matchedOpponent.username : "Tie"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/15 bg-white/8 p-4 text-center shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Margin</p>
                    <p className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">+{battleSummary.margin}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/15 bg-white/8 p-4 text-center shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Rounds</p>
                    <p className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">{battleSummary.totalRoundsLabel}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[18px] border border-violet-400/25 bg-violet-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Your Score</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{youScore}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Accuracy {battleSummary.userAccuracy}% • Best streak {bestYouStreak}</p>
                </div>
                <div className="rounded-[18px] border border-orange-400/25 bg-orange-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Opponent Score</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{opponentScore}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Accuracy {battleSummary.opponentAccuracy}% • Best streak {bestOpponentStreak}</p>
                </div>
                <div className="rounded-[18px] border border-emerald-400/25 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Your Avg Time</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{battleSummary.userAverageTime}s</p>
                  <p className="text-xs text-[var(--text-secondary)]">Points per round {battleSummary.averagePointsPerRound}</p>
                </div>
                <div className="rounded-[18px] border border-cyan-400/25 bg-cyan-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Opponent Avg Time</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{battleSummary.opponentAverageTime}s</p>
                  <p className="text-xs text-[var(--text-secondary)]">{battleSummary.bestRound ? `Best combined round: #${battleSummary.bestRound.round}` : "No recap yet"}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/42">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                      <Target className="h-4 w-4 text-violet-400" /> Match Stats
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Round performance and battle signals.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {battleSummary.roundProgress}% complete
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Best user streak</span>
                      <span className="font-semibold text-[var(--text-primary)]">x{bestYouStreak}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(100, bestYouStreak * 18)}%` }} />
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Best opponent streak</span>
                      <span className="font-semibold text-[var(--text-primary)]">x{bestOpponentStreak}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-400" style={{ width: `${Math.min(100, bestOpponentStreak * 18)}%` }} />
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Resolved category</span>
                      <span className="font-semibold text-[var(--text-primary)]">{battleCategoryLabel ?? resolvedCategoryName ?? selectedCategoryLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/42">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                      <Clock3 className="h-4 w-4 text-cyan-400" /> Round Recap
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Latest round-by-round scoring snapshot.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {roundResults.length} rounds
                  </span>
                </div>

                <div className="max-h-[300px] space-y-2 overflow-auto pr-1">
                  {roundResults.map((round) => (
                    <article key={round.id} className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-sora text-sm font-semibold text-[var(--text-primary)]">Round {round.round}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{round.question}</p>
                        </div>
                        <span className={cx(
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                          round.userPoints >= round.opponentPoints
                            ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                            : "border border-rose-400/35 bg-rose-500/10 text-rose-200"
                        )}>
                          {round.userPoints >= round.opponentPoints ? "Won" : "Lost"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-[14px] border border-violet-400/20 bg-violet-500/8 p-2.5 text-xs text-[var(--text-secondary)]">
                          <p className="font-semibold text-[var(--text-primary)]">You</p>
                          <p>Answer: {round.userAnswer ?? "No answer"}</p>
                          <p>Points: {round.userPoints} • Streak x{round.userStreakAfter}</p>
                          <p>Time: {round.userTimeSpent}s</p>
                        </div>
                        <div className="rounded-[14px] border border-orange-400/20 bg-orange-500/8 p-2.5 text-xs text-[var(--text-secondary)]">
                          <p className="font-semibold text-[var(--text-primary)]">Opponent</p>
                          <p>Answer: {round.opponentAnswer ?? "Wrong / timeout"}</p>
                          <p>Points: {round.opponentPoints} • Streak x{round.opponentStreakAfter}</p>
                          <p>Time: {round.opponentTimeSpent}s</p>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!roundResults.length ? (
                    <div className="rounded-[18px] border border-black/10 bg-black/5 p-4 text-sm text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5">
                      Round data will appear here once the match is completed.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                aria-label="Rematch"
                onClick={startSearch}
                disabled={!selectedMode || !selectedCategory}
                className={cx(
                  "focus-ring arcade-btn btn-primary rounded-button px-4 py-2 text-sm",
                  (!selectedMode || !selectedCategory) && "cursor-not-allowed opacity-55"
                )}
              >
                Rematch
              </button>
              <button
                type="button"
                aria-label="Find new opponent"
                onClick={resetToSetup}
                className="focus-ring arcade-btn rounded-button border border-black/8 px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-green-400 hover:text-green-700 dark:border-white/15 dark:text-white/80 dark:hover:text-green-200"
              >
                New Opponent
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaveConfirm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 grid place-items-center bg-black/55 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-[22px] border border-rose-400/35 bg-[var(--bg-card)] p-5 shadow-[0_22px_56px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                <AlertTriangle className="h-5 w-5 text-rose-300" /> Leave Ongoing 1v1 Battle?
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                If you leave now, the opponent wins by default and this match will be saved as a loss.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={stayInBattle}
                  className="focus-ring arcade-btn rounded-button border border-black/10 px-4 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:text-white/80"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={confirmLeaveBattle}
                  className="focus-ring arcade-btn rounded-button border border-rose-400/45 bg-rose-500/16 px-4 py-2 text-sm font-semibold text-rose-100"
                >
                  Leave Battle
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

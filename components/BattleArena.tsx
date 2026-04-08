"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, LoaderCircle, Trophy, ShieldAlert, Image, CircleCheck, Type, Flame, BookOpen, Sparkles, Radar } from "lucide-react";
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

const buildBattleQuestions = (categoryName: string, modeId: BattleModeId): PreparedBattleQuestion[] => {
  const selectedCategory = categoryMeta.find((category) => category.name === categoryName);
  const selectedMode = battleModes.find((mode) => mode.id === modeId);

  if (!selectedCategory || !selectedMode) return [];

  const categoryPool = questions.filter((question) => question.category === selectedCategory.name);
  const fallbackPool = categoryPool.length ? categoryPool : questions;
  const picked = shuffleArray(fallbackPool).slice(0, selectedMode.rounds);

  return picked.map((question) => {
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
};

export default function BattleArena() {
  const { photo: profilePhoto } = useProfilePhotoStore();
  const { displayName, tier } = useProfileStore();

  const [state, setState] = useState<BattleState>("idle");
  const [setupTab, setSetupTab] = useState<"mode" | "category">("mode");
  const [countdown, setCountdown] = useState(3);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [youScore, setYouScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const [selectedMode, setSelectedMode] = useState<BattleModeId | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [battleQuestions, setBattleQuestions] = useState<PreparedBattleQuestion[]>([]);
  const [matchedOpponent, setMatchedOpponent] = useState<BattleOpponent>({
    username: "RogueNeuron",
    rank: "Pro",
    photo: { type: "initials", value: "RN" },
  });

  const persistedBattleKeyRef = useRef<string | null>(null);

  const activeMode = useMemo(
    () => battleModes.find((mode) => mode.id === selectedMode) ?? null,
    [selectedMode]
  );

  const activeCategory = useMemo(() => categoryMeta.find((category) => category.name === selectedCategory) ?? null, [selectedCategory]);

  const question = battleQuestions[index];

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

  const advanceRound = useCallback(() => {
    if (index >= battleQuestions.length - 1) {
      setState("finished");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(activeMode?.secondsPerRound ?? 12);
  }, [activeMode?.secondsPerRound, battleQuestions.length, index]);

  useEffect(() => {
    if (state !== "searching") return;
    const timer = setTimeout(() => {
      setCountdown(3);
      setState("found");
    }, 1800);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state !== "countdown") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setState("playing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state !== "playing" || revealed || !battleQuestions.length) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            setRevealed(true);
            if (Math.random() > 0.45) {
              setOpponentScore((score) => score + 1);
            }
            setTimeout(() => advanceRound(), 700);
          }, 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [advanceRound, battleQuestions.length, revealed, state]);

  const startSearch = () => {
    if (!selectedMode || !selectedCategory) return;
    const prepared = buildBattleQuestions(selectedCategory, selectedMode);
    if (!prepared.length) return;

    const mode = battleModes.find((item) => item.id === selectedMode);

    setBattleQuestions(prepared);
    setState("searching");
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setYouScore(0);
    setOpponentScore(0);
    setTimeLeft(mode?.secondsPerRound ?? 12);
    void pickOpponent().then((opponent) => setMatchedOpponent(opponent));
  };

  const startMatch = () => {
    setCountdown(3);
    setState("countdown");
  };

  const resetToSetup = () => {
    setState("idle");
    setSetupTab("mode");
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setYouScore(0);
    setOpponentScore(0);
  };

  useEffect(() => {
    if (state !== "finished" || !selectedMode || !selectedCategory) return;

    const battleKey = `${selectedMode}:${selectedCategory}:${youScore}:${opponentScore}:${battleQuestions.length}:${matchedOpponent.username}`;
    if (persistedBattleKeyRef.current === battleKey) return;
    persistedBattleKeyRef.current = battleKey;

    const result = youScore > opponentScore ? "win" : youScore < opponentScore ? "loss" : "draw";
    void persistBattleSessionToSupabase({
      mode: selectedMode,
      category: selectedCategory,
      result,
      userScore: youScore,
      opponentScore,
      opponentName: matchedOpponent.username,
    });
  }, [battleQuestions.length, matchedOpponent.username, opponentScore, selectedCategory, selectedMode, state, youScore]);

  const chooseAnswer = (value: string) => {
    if (revealed || state !== "playing" || !question) return;
    setSelected(value);
    setTimeout(() => {
      setRevealed(true);
      if (value === question.correctAnswer) {
        setYouScore((s) => s + 1);
      }
      const opponentGotIt = Math.random() > 0.35;
      if (opponentGotIt) setOpponentScore((s) => s + 1);
      setTimeout(() => advanceRound(), 700);
    }, 600);
  };

  return (
    <section className="quiz-shell relative overflow-hidden rounded-[28px] border border-black/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.7),rgba(255,255,255,0.42))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(15,23,42,0.45))] dark:shadow-[0_26px_68px_rgba(2,8,25,0.52)] sm:p-6">
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
                  <p className="font-semibold text-[var(--text-primary)]">{activeCategory?.name ?? "Not selected"}</p>
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
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            {activeMode && activeCategory && (
              <p className="text-xs text-[var(--text-muted)]">
                {activeMode.label} • {activeCategory.name}
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
              {activeMode?.label} • {activeCategory?.name}
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                aria-label="Start match"
                onClick={startMatch}
                className="focus-ring arcade-btn btn-primary inline-flex items-center gap-2 rounded-button px-5 py-2.5 font-medium"
              >
                <Swords className="h-4 w-4" /> Start Match
              </button>
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
            <div className="quiz-meta mb-3 grid gap-3 sm:grid-cols-[1fr_56px_1fr] sm:items-center">
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="h-2 rounded-full bg-violet-400" style={{ width: `${(youScore / (battleQuestions.length || 1)) * 100}%` }} />
              </div>
              <Timer timeLeft={timeLeft} total={activeMode?.secondsPerRound ?? 12} />
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="ml-auto h-2 rounded-full bg-orange-400" style={{ width: `${(opponentScore / (battleQuestions.length || 1)) * 100}%` }} />
              </div>
            </div>

            <div className="mb-3 flex justify-between text-sm text-[var(--text-secondary)]">
              <p>You: {youScore}</p>
              <p>Opponent: {opponentScore}</p>
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
          </motion.div>
        )}

        {state === "finished" && (
          <motion.div key="finished" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1] space-y-4 text-center">
            <div
              className={cx(
                "rounded-card border p-4",
                youScore >= opponentScore
                  ? "border-green-400/35 bg-green-500/10 text-green-800 dark:text-green-200"
                  : "border-red-400/35 bg-red-500/10 text-red-800 dark:text-red-200"
              )}
            >
              {youScore >= opponentScore ? (
                <p className="inline-flex items-center gap-1 font-sora text-xl font-semibold"><Trophy className="h-5 w-5" /> You Won!</p>
              ) : (
                <p className="inline-flex items-center gap-1 font-sora text-xl font-semibold"><ShieldAlert className="h-5 w-5" /> Defeat</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-violet-400/25 bg-violet-500/10 p-4">
                <p className="text-sm text-[var(--text-secondary)]">You</p>
                <p className="font-sora text-3xl font-bold text-[var(--text-primary)]">{youScore}</p>
                <p className="text-xs text-[var(--text-secondary)]">Accuracy {(youScore / (battleQuestions.length || 1) * 100).toFixed(0)}%</p>
              </div>
              <div className="rounded-card border border-orange-400/25 bg-orange-500/10 p-4">
                <p className="text-sm text-[var(--text-secondary)]">Opponent</p>
                <p className="font-sora text-3xl font-bold text-[var(--text-primary)]">{opponentScore}</p>
                <p className="text-xs text-[var(--text-secondary)]">Accuracy {(opponentScore / (battleQuestions.length || 1) * 100).toFixed(0)}%</p>
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="h-full bg-gradient-to-r from-violet-500 to-orange-400" style={{ width: `${(youScore / (youScore + opponentScore || 1)) * 100}%` }} />
            </div>

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
    </section>
  );
}

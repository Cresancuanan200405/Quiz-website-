"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, LoaderCircle, Trophy, ShieldAlert } from "lucide-react";
import { currentUser, questions } from "@/lib/mockData";
import type { BattleState } from "@/lib/types";
import AnswerButton from "@/components/AnswerButton";
import Timer from "@/components/Timer";
import { cx } from "@/lib/utils";

const battleQuestions = questions.slice(5, 10);
const letters = ["A", "B", "C", "D"];

export default function BattleArena() {
  const [state, setState] = useState<BattleState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [youScore, setYouScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);

  const opponent = useMemo(
    () => ({ username: "RogueNeuron", avatar: "RN", rank: "Pro Rank" }),
    []
  );

  const question = battleQuestions[index];

  const advanceRound = useCallback(() => {
    if (index >= battleQuestions.length - 1) {
      setState("finished");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(12);
  }, [index]);

  useEffect(() => {
    if (state !== "searching") return;
    const timer = setTimeout(() => {
      setCountdown(3);
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
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state !== "playing" || revealed) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            setRevealed(true);
            setTimeout(() => advanceRound(), 700);
          }, 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [advanceRound, revealed, state]);

  const startSearch = () => {
    setState("searching");
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setYouScore(0);
    setOpponentScore(0);
    setTimeLeft(12);
  };

  const chooseAnswer = (value: string) => {
    if (revealed || state !== "playing") return;
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
    <section className="quiz-shell glass rounded-card p-4">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2 className="mb-2 font-sora text-2xl font-semibold text-[var(--text-primary)]">Arcade 1v1 Arena</h2>
            <p className="mb-6 max-w-xl text-[var(--text-secondary)]">
              Queue into real-time trivia rounds, race your opponent, and climb your battle rank.
            </p>
            <button
              type="button"
              aria-label="Find opponent"
              onClick={startSearch}
              className="focus-ring arcade-btn btn-success inline-flex items-center gap-2 rounded-button px-5 py-2.5 font-medium"
            >
              <Swords className="h-4 w-4" /> Find Opponent
            </button>
          </motion.div>
        )}

        {state === "searching" && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid place-items-center gap-4 py-8 text-center">
            <LoaderCircle className="h-10 w-10 animate-spin text-violet-300" />
            <p className="font-sora text-xl text-[var(--text-primary)]">Finding opponent...</p>
            <p className="text-sm text-[var(--text-secondary)]">Matching you with a player near your skill tier</p>
            <button
              type="button"
              aria-label="Cancel matchmaking"
              onClick={() => setState("idle")}
              className="focus-ring arcade-btn rounded-button border border-black/8 px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-red-400 hover:text-red-700 dark:border-white/15 dark:text-white/75 dark:hover:text-red-200"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {state === "found" && (
          <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
            <div className="quiz-meta grid grid-cols-3 items-center gap-4 text-center">
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-card border border-violet-400/25 bg-violet-500/10 p-4">
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-violet-500/20 font-semibold text-violet-700 dark:text-violet-200">
                  {currentUser.avatar}
                </div>
                <p className="text-[var(--text-primary)]">{currentUser.username}</p>
              </motion.div>
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-sora text-3xl font-bold text-violet-300">
                VS
              </motion.div>
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-card border border-orange-400/25 bg-orange-500/10 p-4">
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-orange-500/20 font-semibold text-orange-700 dark:text-orange-200">
                  {opponent.avatar}
                </div>
                <p className="text-[var(--text-primary)]">{opponent.username}</p>
              </motion.div>
            </div>
            <p className="mt-5 text-center text-[var(--text-secondary)]">Battle starts in {countdown}...</p>
          </motion.div>
        )}

        {state === "playing" && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="quiz-shell">
            <div className="quiz-meta mb-3 grid gap-3 sm:grid-cols-[1fr_56px_1fr] sm:items-center">
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="h-2 rounded-full bg-violet-400" style={{ width: `${(youScore / battleQuestions.length) * 100}%` }} />
              </div>
              <Timer timeLeft={timeLeft} total={12} />
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="ml-auto h-2 rounded-full bg-orange-400" style={{ width: `${(opponentScore / battleQuestions.length) * 100}%` }} />
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

            <div className="quiz-options grid gap-2.5 sm:grid-cols-2">
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
          <motion.div key="finished" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
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
                <p className="text-xs text-[var(--text-secondary)]">Accuracy {(youScore / battleQuestions.length * 100).toFixed(0)}%</p>
              </div>
              <div className="rounded-card border border-orange-400/25 bg-orange-500/10 p-4">
                <p className="text-sm text-[var(--text-secondary)]">Opponent</p>
                <p className="font-sora text-3xl font-bold text-[var(--text-primary)]">{opponentScore}</p>
                <p className="text-xs text-[var(--text-secondary)]">Accuracy {(opponentScore / battleQuestions.length * 100).toFixed(0)}%</p>
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
                className="focus-ring arcade-btn btn-primary rounded-button px-4 py-2 text-sm"
              >
                Rematch
              </button>
              <button
                type="button"
                aria-label="Find new opponent"
                onClick={() => setState("idle")}
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

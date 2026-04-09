"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Clock3, Gauge, Medal, Rocket, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";

export default function ResultsPage() {
  const params = useSearchParams();
  const score = Math.max(0, Number(params.get("score") ?? 0));
  const total = Math.max(1, Number(params.get("total") ?? 10));
  const category = params.get("category") ?? "Mixed";
  const difficulty = params.get("difficulty") ?? "Easy";
  const count = Number(params.get("count") ?? total);
  const timeTaken = Math.max(0, Number(params.get("timeTaken") ?? 120));
  const earnedPoints = Math.max(0, Number(params.get("points") ?? score * 120));
  const incorrect = Math.max(0, total - score);
  const targetAccuracy = Math.round((score / total) * 100);
  const avgTime = timeTaken / Math.max(1, total);
  const replayHref = `/quiz?instant=1&replay=1&category=${encodeURIComponent(category)}&difficulty=${encodeURIComponent(difficulty)}&count=${count}`;

  const quizzesCompleted = usePlayerStatsStore((state) => state.quizzesCompleted);
  const totalPoints = usePlayerStatsStore((state) => state.totalPoints);
  const bestStreak = usePlayerStatsStore((state) => state.bestStreak);
  const totalCorrectAnswers = usePlayerStatsStore((state) => state.totalCorrectAnswers);
  const totalAnsweredQuestions = usePlayerStatsStore((state) => state.totalAnsweredQuestions);

  const [animatedAccuracy, setAnimatedAccuracy] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let frame = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / duration);
      setAnimatedAccuracy(Math.round(targetAccuracy * progress));
      setAnimatedScore(Math.round(score * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score, targetAccuracy]);

  const confetti = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({ id: i, left: `${(i / 18) * 100}%`, delay: `${(i % 6) * 0.2}s`, color: ["#7C3AED", "#22C55E", "#F59E0B", "#EF4444"][i % 4] })),
    []
  );

  const performanceLabel =
    targetAccuracy >= 90 ? "Elite run" : targetAccuracy >= 75 ? "Strong run" : targetAccuracy >= 55 ? "Good progress" : "Keep practicing";
  const paceLabel = avgTime <= 7 ? "Lightning" : avgTime <= 11 ? "Balanced" : "Methodical";
  const globalAccuracy = totalAnsweredQuestions > 0 ? Math.round((totalCorrectAnswers / totalAnsweredQuestions) * 100) : 0;
  const estimatedRank = Math.max(1, 30 - Math.round(targetAccuracy / 4) - Math.round(score / 2));
  const rankGain = Math.max(1, Math.round((targetAccuracy / 100) * 4));

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 text-[var(--text-primary)] sm:py-10">
      <section className="glass relative w-full overflow-hidden rounded-[30px] border border-violet-400/22 bg-white/74 p-5 shadow-[0_24px_85px_rgba(15,23,42,0.2)] sm:p-7 dark:bg-slate-950/52">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-violet-500/16 blur-3xl" />
          <div className="absolute -right-14 top-14 h-52 w-52 rounded-full bg-cyan-400/14 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="confetti"
            style={{ left: piece.left, animationDelay: piece.delay, backgroundColor: piece.color }}
          />
        ))}

        <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Quiz Complete
            </p>
            <h1 className="mt-3 font-sora text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl">{category} Mission Debrief</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-[15px]">
              You finished a {difficulty.toLowerCase()} route with {count} questions. Here is a clear breakdown of your performance and progression.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-xs font-medium text-[var(--text-primary)] dark:border-white/10 dark:bg-white/5">Category: {category}</span>
              <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-xs font-medium text-[var(--text-primary)] dark:border-white/10 dark:bg-white/5">Difficulty: {difficulty}</span>
              <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-xs font-medium text-[var(--text-primary)] dark:border-white/10 dark:bg-white/5">Question set: {total}</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-200">
              <span className="text-sm font-semibold">Rank #{estimatedRank}</span>
              <ArrowUpRight className="h-4 w-4" />
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs">+{rankGain} ranks</span>
            </div>
          </div>

          <div className="grid place-items-center rounded-[24px] border border-violet-400/22 bg-white/60 p-4 dark:bg-white/5">
            <ProgressRing value={animatedAccuracy} label="Accuracy" />
            <p className="mt-3 font-sora text-5xl font-bold text-[var(--text-primary)]">{animatedScore}/{total}</p>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{performanceLabel}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Correct", value: `${score}`, icon: <ShieldCheck className="h-4 w-4 text-emerald-500" /> },
            { label: "Incorrect", value: `${incorrect}`, icon: <Target className="h-4 w-4 text-rose-500" /> },
            { label: "Avg Time", value: `${avgTime.toFixed(1)}s`, icon: <Clock3 className="h-4 w-4 text-cyan-500" /> },
            { label: "Session Points", value: `${earnedPoints}`, icon: <Medal className="h-4 w-4 text-amber-500" /> },
            { label: "Lifetime Best Streak", value: `${bestStreak}`, icon: <Rocket className="h-4 w-4 text-violet-500" /> },
            { label: "Lifetime Points", value: `${totalPoints}`, icon: <Trophy className="h-4 w-4 text-indigo-500" /> },
          ].map((item) => (
            <article key={item.label} className="rounded-[20px] border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{item.label}</p>
                {item.icon}
              </div>
              <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="rounded-[20px] border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">Performance Insight</p>
            <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
              <p className="flex items-center justify-between rounded-xl border border-violet-400/20 bg-white/60 px-3 py-2 dark:bg-white/5">
                <span>Accuracy tier</span>
                <span className="font-semibold text-[var(--text-primary)]">{performanceLabel}</span>
              </p>
              <p className="flex items-center justify-between rounded-xl border border-violet-400/20 bg-white/60 px-3 py-2 dark:bg-white/5">
                <span>Answer pace</span>
                <span className="font-semibold text-[var(--text-primary)]">{paceLabel}</span>
              </p>
              <p className="flex items-center justify-between rounded-xl border border-violet-400/20 bg-white/60 px-3 py-2 dark:bg-white/5">
                <span>Overall account accuracy</span>
                <span className="font-semibold text-[var(--text-primary)]">{globalAccuracy}%</span>
              </p>
            </div>
          </article>

          <article className="rounded-[20px] border border-cyan-400/20 bg-cyan-500/10 p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200">
              <Gauge className="h-4 w-4" /> Progress Snapshot
            </p>
            <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
              <p className="rounded-xl border border-cyan-400/20 bg-white/60 px-3 py-2 dark:bg-white/5">Quizzes completed: <span className="font-semibold text-[var(--text-primary)]">{quizzesCompleted}</span></p>
              <p className="rounded-xl border border-cyan-400/20 bg-white/60 px-3 py-2 dark:bg-white/5">Questions solved overall: <span className="font-semibold text-[var(--text-primary)]">{totalCorrectAnswers}/{Math.max(1, totalAnsweredQuestions)}</span></p>
              <p className="rounded-xl border border-cyan-400/20 bg-white/60 px-3 py-2 dark:bg-white/5">Session duration: <span className="font-semibold text-[var(--text-primary)]">{timeTaken}s</span></p>
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={replayHref} className="focus-ring arcade-btn btn-primary rounded-button px-4 py-2 text-sm">
            Play Again
          </Link>
          <Link href="/quiz" className="focus-ring arcade-btn rounded-button border border-black/8 px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-violet-400 dark:border-white/20 dark:text-white/80">
            Try Another Quiz
          </Link>
          <Link href="/leaderboard" className="focus-ring arcade-btn rounded-button bg-black/5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/6 dark:text-white/80 dark:hover:bg-white/12">
            View Leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}

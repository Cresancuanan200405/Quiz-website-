"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";

export default function ResultsPage() {
  const params = useSearchParams();
  const score = Number(params.get("score") ?? 0);
  const total = Number(params.get("total") ?? 10);
  const category = params.get("category") ?? "Mixed";
  const difficulty = params.get("difficulty") ?? "Easy";
  const count = Number(params.get("count") ?? total);
  const timeTaken = Number(params.get("timeTaken") ?? 120);
  const targetAccuracy = total ? Math.round((score / total) * 100) : 0;
  const replayHref = `/quiz?instant=1&category=${encodeURIComponent(category)}&difficulty=${encodeURIComponent(difficulty)}&count=${count}`;

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

  return (
    <main className="relative mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-10 text-[var(--text-primary)]">
      <section className="glass relative w-full overflow-hidden rounded-card p-6 text-center sm:p-8">
        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="confetti"
            style={{ left: piece.left, animationDelay: piece.delay, backgroundColor: piece.color }}
          />
        ))}

        <p className="mb-2 text-sm uppercase tracking-[0.28em] text-violet-700 dark:text-violet-200">Quiz Complete</p>
        <h1 className="mb-6 font-sora text-3xl font-bold text-[var(--text-primary)]">{category} Results</h1>

        <div className="mb-6 grid place-items-center">
          <ProgressRing value={animatedAccuracy} label="Accuracy" />
          <p className="mt-4 font-sora text-5xl font-bold text-[var(--text-primary)]">{animatedScore}/{total}</p>
        </div>

        <div className="mb-5 flex items-center justify-center gap-2 rounded-full border border-green-400/25 bg-green-500/10 px-3 py-2 text-green-700 dark:text-green-200">
          <span className="text-sm">Rank #12</span>
          <ArrowUpRight className="h-4 w-4" />
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs">+3 ranks</span>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Correct", `${score}`],
            ["Best Streak", `${Math.max(1, Math.floor(score / 2))}`],
            ["Avg Time", `${(timeTaken / Math.max(1, total)).toFixed(1)}s`],
            ["Points", `${score * 120}`],
          ].map(([label, value]) => (
            <article key={label} className="rounded-card border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
              <p className="mt-1 font-sora text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
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

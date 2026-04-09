"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Compass, Layers, Sparkles, Target } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import FactCard from "@/components/FactCard";
import { triviaFacts } from "@/lib/mockData";
import { useTriviaFactsStore } from "@/lib/triviaFactsStore";
import type { TriviaCategory } from "@/lib/types";
import { cx } from "@/lib/utils";

const filters: Array<"All" | TriviaCategory> = ["All", "Science", "History", "Tech", "Nature", "Arts"];

export default function TriviaPage() {
  const [activeFilter, setActiveFilter] = useState<"All" | TriviaCategory>("All");
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const { likedFactIds, savedFactIds, toggleLike, toggleSave } = useTriviaFactsStore();

  const likedFacts = useMemo(() => new Set(likedFactIds), [likedFactIds]);
  const savedFacts = useMemo(() => new Set(savedFactIds), [savedFactIds]);

  const filteredFacts = useMemo(
    () => triviaFacts.filter((fact) => activeFilter === "All" || fact.category === activeFilter),
    [activeFilter]
  );

  const featured = filteredFacts[currentFactIndex % Math.max(filteredFacts.length, 1)];

  const goNext = () => {
    setCurrentFactIndex((index) => (filteredFacts.length ? (index + 1) % filteredFacts.length : 0));
  };

  return (
    <div className="relative min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-7rem] top-20 h-72 w-72 rounded-full bg-violet-500/16 blur-3xl" />
        <div className="absolute right-[-6rem] top-28 h-80 w-80 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
      </div>

      <Sidebar />
      <TopBar title="Trivia Journey Hub" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full px-2.5 py-4 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-4"
      >
        <div className="mx-auto w-full max-w-[1400px] space-y-3">
          <section className="glass relative overflow-hidden rounded-[28px] border border-violet-400/20 bg-white/78 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:bg-slate-950/52">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-10 top-8 h-28 w-28 rounded-full bg-violet-500/12 blur-2xl" />
              <div className="absolute right-10 top-12 h-40 w-40 rounded-full bg-cyan-400/12 blur-2xl" />
            </div>

            <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                  <Compass className="h-3.5 w-3.5" />
                  Journey Lore Stream
                </div>
                <h1 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">Trivia Hub</h1>
                <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-[15px]">
                  Explore a campaign-styled stream of curated lore cards, filter by realm, and keep your saved facts aligned with the same design language as Trivia Journey.
                </p>

                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-label={`Filter by ${filter}`}
                      onClick={() => {
                        setActiveFilter(filter);
                        setCurrentFactIndex(0);
                      }}
                      className={cx(
                        "focus-ring arcade-btn rounded-full border px-3 py-1.5 text-sm",
                        activeFilter === filter
                          ? "border-violet-400 bg-violet-500 text-white shadow-violet-glow"
                          : "border-black/8 bg-white/70 text-[var(--text-secondary)] hover:border-violet-400 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[20px] border border-black/8 bg-white/72 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Filtered facts</p>
                    <Layers className="h-4 w-4 text-violet-500" />
                  </div>
                  <p className="mt-2 font-sora text-2xl font-bold text-[var(--text-primary)]">{filteredFacts.length}</p>
                </div>
                <div className="rounded-[20px] border border-black/8 bg-white/72 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Liked facts</p>
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                  </div>
                  <p className="mt-2 font-sora text-2xl font-bold text-[var(--text-primary)]">{likedFacts.size}</p>
                </div>
                <div className="rounded-[20px] border border-black/8 bg-white/72 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Saved facts</p>
                    <Target className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="mt-2 font-sora text-2xl font-bold text-[var(--text-primary)]">{savedFacts.size}</p>
                </div>
              </div>
            </div>
          </section>

          {featured ? (
            <section className="rounded-[24px] border border-violet-400/18 bg-[var(--bg-secondary)]/70 p-1 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <FactCard
                fact={featured}
                featured
                liked={likedFacts.has(featured.id)}
                saved={savedFacts.has(featured.id)}
                onLike={() =>
                  toggleLike(featured.id, {
                    id: featured.id,
                    title: featured.title,
                    body: featured.body,
                    category: featured.category,
                  })
                }
                onSave={() =>
                  toggleSave(featured.id, {
                    id: featured.id,
                    title: featured.title,
                    body: featured.body,
                    category: featured.category,
                  })
                }
                onNext={goNext}
              />
            </section>
          ) : null}

          <section className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredFacts.map((fact) => (
              <FactCard
                key={fact.id}
                fact={fact}
                liked={likedFacts.has(fact.id)}
                saved={savedFacts.has(fact.id)}
                onLike={() =>
                  toggleLike(fact.id, {
                    id: fact.id,
                    title: fact.title,
                    body: fact.body,
                    category: fact.category,
                  })
                }
                onSave={() =>
                  toggleSave(fact.id, {
                    id: fact.id,
                    title: fact.title,
                    body: fact.body,
                    category: fact.category,
                  })
                }
                onNext={goNext}
              />
            ))}
          </section>
        </div>
      </motion.main>
    </div>
  );
}

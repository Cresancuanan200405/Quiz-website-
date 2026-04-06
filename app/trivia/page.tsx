"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import FactCard from "@/components/FactCard";
import { triviaFacts } from "@/lib/mockData";
import type { TriviaCategory } from "@/lib/types";
import { cx } from "@/lib/utils";

const filters: Array<"All" | TriviaCategory> = ["All", "Science", "History", "Tech", "Nature", "Arts"];

export default function TriviaPage() {
  const [activeFilter, setActiveFilter] = useState<"All" | TriviaCategory>("All");
  const [likedFacts, setLikedFacts] = useState<Set<string>>(new Set());
  const [savedFacts, setSavedFacts] = useState<Set<string>>(new Set());
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  const filteredFacts = useMemo(
    () => triviaFacts.filter((fact) => activeFilter === "All" || fact.category === activeFilter),
    [activeFilter]
  );

  const featured = filteredFacts[currentFactIndex % Math.max(filteredFacts.length, 1)];

  const goNext = () => {
    setCurrentFactIndex((index) => (filteredFacts.length ? (index + 1) % filteredFacts.length : 0));
  };

  return (
    <div className="min-h-screen pb-20 text-[var(--text-primary)] md:pb-0">
      <Sidebar />
      <TopBar title="Trivia Hub" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full px-4 py-6 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8"
      >
        <div className="mx-auto w-full max-w-5xl space-y-5">
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

        {featured ? (
          <FactCard
            fact={featured}
            featured
            liked={likedFacts.has(featured.id)}
            saved={savedFacts.has(featured.id)}
            onLike={() =>
              setLikedFacts((prev) => {
                const next = new Set(prev);
                if (next.has(featured.id)) next.delete(featured.id);
                else next.add(featured.id);
                return next;
              })
            }
            onSave={() =>
              setSavedFacts((prev) => {
                const next = new Set(prev);
                if (next.has(featured.id)) next.delete(featured.id);
                else next.add(featured.id);
                return next;
              })
            }
            onNext={goNext}
          />
        ) : null}

        <section className="space-y-3 overflow-y-auto">
          {filteredFacts.map((fact) => (
            <FactCard
              key={fact.id}
              fact={fact}
              liked={likedFacts.has(fact.id)}
              saved={savedFacts.has(fact.id)}
              onLike={() =>
                setLikedFacts((prev) => {
                  const next = new Set(prev);
                  if (next.has(fact.id)) next.delete(fact.id);
                  else next.add(fact.id);
                  return next;
                })
              }
              onSave={() =>
                setSavedFacts((prev) => {
                  const next = new Set(prev);
                  if (next.has(fact.id)) next.delete(fact.id);
                  else next.add(fact.id);
                  return next;
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

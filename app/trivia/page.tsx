"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, ChevronLeft, ChevronRight, Compass, Layers, Sparkles, Target, TrendingUp } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import FactCard from "@/components/FactCard";
import { triviaFacts } from "@/lib/mockData";
import { useTriviaFactsStore } from "@/lib/triviaFactsStore";
import type { TriviaCategory, TriviaFact } from "@/lib/types";
import { cx } from "@/lib/utils";

const filters: Array<"All" | TriviaCategory> = ["All", "Science", "History", "Tech", "Nature", "Arts"];

export default function TriviaPage() {
  const [activeFilter, setActiveFilter] = useState<"All" | TriviaCategory>("All");
  const [currentSlide, setCurrentSlide] = useState(0);
  const { likedFactIds, savedFactIds, factActivity, toggleLike, toggleSave } = useTriviaFactsStore();

  const likedFacts = useMemo(() => new Set(likedFactIds), [likedFactIds]);
  const savedFacts = useMemo(() => new Set(savedFactIds), [savedFactIds]);

  const filteredFacts = useMemo(
    () => triviaFacts.filter((fact) => activeFilter === "All" || fact.category === activeFilter),
    [activeFilter]
  );

  const factActivityMeta = useMemo(() => {
    const map = new Map<string, { interactions: number; latestAt: number | null }>();

    factActivity.forEach((item) => {
      const previous = map.get(item.factId) ?? { interactions: 0, latestAt: null };
      const timestamp = Date.parse(item.at);
      map.set(item.factId, {
        interactions: previous.interactions + 1,
        latestAt: Number.isNaN(timestamp) ? previous.latestAt : Math.max(previous.latestAt ?? 0, timestamp),
      });
    });

    return map;
  }, [factActivity]);

  const mostRecentActivityAt = useMemo(() => {
    let latest = 0;
    factActivityMeta.forEach((meta) => {
      const at = meta.latestAt ?? 0;
      if (at > latest) latest = at;
    });
    return latest;
  }, [factActivityMeta]);

  const scoredFacts = useMemo(() => {
    return filteredFacts.map((fact) => {
      const activityMeta = factActivityMeta.get(fact.id) ?? { interactions: 0, latestAt: null };
      const isLiked = likedFacts.has(fact.id);
      const isSaved = savedFacts.has(fact.id);

      let recencyBoost = 0;
      if (activityMeta.latestAt && mostRecentActivityAt) {
        const hoursFromLatest = (mostRecentActivityAt - activityMeta.latestAt) / (1000 * 60 * 60);
        if (hoursFromLatest <= 24) recencyBoost = 20;
        else if (hoursFromLatest <= 72) recencyBoost = 10;
        else recencyBoost = 4;
      }

      const relevanceScore =
        fact.likes +
        activityMeta.interactions * 5 +
        (isSaved ? 24 : 0) +
        (isLiked ? 14 : 0) +
        recencyBoost;

      return {
        fact,
        relevanceScore,
        latestAt: activityMeta.latestAt,
      };
    });
  }, [factActivityMeta, filteredFacts, likedFacts, mostRecentActivityAt, savedFacts]);

  const spotlightFacts = useMemo(
    () => [...scoredFacts].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 6),
    [scoredFacts]
  );

  const latestFacts = useMemo(
    () =>
      [...scoredFacts]
        .sort((a, b) => {
          const aAt = a.latestAt ?? 0;
          const bAt = b.latestAt ?? 0;
          if (bAt !== aAt) return bAt - aAt;
          return b.fact.likes - a.fact.likes;
        })
        .slice(0, 6),
    [scoredFacts]
  );

  const importantFacts = useMemo(
    () => [...scoredFacts].sort((a, b) => b.fact.likes - a.fact.likes).slice(0, 6),
    [scoredFacts]
  );

  const carouselSlides = useMemo(() => {
    const pools: Array<{ label: string; item: (typeof spotlightFacts)[number] | undefined; reason: string }> = [
      {
        label: "Most Relevant",
        item: spotlightFacts[0],
        reason: "High engagement from your current hub interactions.",
      },
      {
        label: "Latest",
        item: latestFacts[0],
        reason: "Most recently interacted fact in your current filter.",
      },
      {
        label: "Important Now",
        item: importantFacts[0],
        reason: "Strong baseline significance from community likes.",
      },
    ];

    const unique = new Map<string, { fact: TriviaFact; label: string; reason: string }>();
    pools.forEach((pool) => {
      if (!pool.item) return;
      unique.set(pool.item.fact.id, { fact: pool.item.fact, label: pool.label, reason: pool.reason });
    });

    [...spotlightFacts, ...latestFacts, ...importantFacts].forEach((entry) => {
      if (unique.size >= 6) return;
      if (!unique.has(entry.fact.id)) {
        unique.set(entry.fact.id, {
          fact: entry.fact,
          label: "Spotlight",
          reason: "Trending knowledge card in your current hub context.",
        });
      }
    });

    return Array.from(unique.values());
  }, [importantFacts, latestFacts, spotlightFacts]);

  const slideCount = carouselSlides.length;
  const activeSlideIndex = slideCount > 0 ? ((currentSlide % slideCount) + slideCount) % slideCount : 0;
  const activeSlide = slideCount > 0 ? carouselSlides[activeSlideIndex] : null;

  useEffect(() => {
    if (slideCount <= 1) return;

    const interval = window.setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [slideCount]);

  const openNextSlide = () => {
    if (!slideCount) return;
    setCurrentSlide((prev) => prev + 1);
  };

  const openPreviousSlide = () => {
    if (!slideCount) return;
    setCurrentSlide((prev) => prev - 1);
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
        <div className="mx-auto w-full max-w-[1400px] space-y-4">
          <section className="glass relative overflow-hidden rounded-[28px] border border-violet-400/20 bg-white/78 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:bg-slate-950/52">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-10 top-8 h-28 w-28 rounded-full bg-violet-500/12 blur-2xl" />
              <div className="absolute right-10 top-12 h-40 w-40 rounded-full bg-cyan-400/12 blur-2xl" />
            </div>

            <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                  <Compass className="h-3.5 w-3.5" />
                  Journey Knowledge Hub
                </div>
                <h1 className="font-sora text-3xl font-bold tracking-tight sm:text-4xl">Trivia Hub</h1>
                <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-[15px]">
                  Navigate your knowledge feed by relevance, recency, and impact. This hub now highlights what matters most now, while keeping the full fact library one tap away.
                </p>

                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-label={`Filter by ${filter}`}
                      onClick={() => {
                        setActiveFilter(filter);
                        setCurrentSlide(0);
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
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Latest activity</p>
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                  </div>
                  <p className="mt-2 font-sora text-2xl font-bold text-[var(--text-primary)]">{factActivity.length}</p>
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

          {activeSlide ? (
            <section className="glass relative overflow-hidden rounded-[26px] border border-violet-400/25 bg-gradient-to-br from-violet-100/80 via-white/86 to-cyan-100/62 p-4 shadow-[0_20px_56px_rgba(15,23,42,0.14)] dark:from-violet-500/14 dark:via-slate-900/65 dark:to-cyan-500/12">
              <div className="pointer-events-none absolute -left-8 top-6 h-36 w-36 rounded-full bg-fuchsia-400/18 blur-3xl" />
              <div className="pointer-events-none absolute right-0 top-2 h-44 w-44 rounded-full bg-cyan-400/18 blur-3xl" />

              <div className="relative flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-violet-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-violet-700 dark:text-violet-100">
                    <TrendingUp className="h-3.5 w-3.5" /> Knowledge Carousel
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{activeSlide.reason}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    onClick={openPreviousSlide}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/70 text-[var(--text-secondary)] hover:border-violet-400 dark:border-white/15 dark:bg-white/5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={openNextSlide}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/70 text-[var(--text-secondary)] hover:border-violet-400 dark:border-white/15 dark:bg-white/5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <motion.article
                key={`${activeSlide.fact.id}-${activeSlide.label}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="mt-3 rounded-[22px] border border-black/8 bg-white/72 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-black/25"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-violet-300/35 bg-violet-500/14 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-100">
                    {activeSlide.label}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-[11px] text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5">
                    {activeSlide.fact.category}
                  </span>
                </div>

                <h2 className="font-sora text-2xl font-bold text-[var(--text-primary)]">{activeSlide.fact.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{activeSlide.fact.body}</p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleLike(activeSlide.fact.id, {
                        id: activeSlide.fact.id,
                        title: activeSlide.fact.title,
                        body: activeSlide.fact.body,
                        category: activeSlide.fact.category,
                      })
                    }
                    className={cx(
                      "focus-ring rounded-full border px-3 py-1.5 text-xs",
                      likedFacts.has(activeSlide.fact.id)
                        ? "border-rose-400 bg-rose-500/20 text-rose-700 dark:text-rose-200"
                        : "border-black/10 bg-white/70 text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5"
                    )}
                  >
                    {likedFacts.has(activeSlide.fact.id) ? "Liked" : "Like"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleSave(activeSlide.fact.id, {
                        id: activeSlide.fact.id,
                        title: activeSlide.fact.title,
                        body: activeSlide.fact.body,
                        category: activeSlide.fact.category,
                      })
                    }
                    className={cx(
                      "focus-ring rounded-full border px-3 py-1.5 text-xs",
                      savedFacts.has(activeSlide.fact.id)
                        ? "border-violet-400 bg-violet-500/20 text-violet-700 dark:text-violet-200"
                        : "border-black/10 bg-white/70 text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5"
                    )}
                  >
                    {savedFacts.has(activeSlide.fact.id) ? "Saved" : "Save"}
                  </button>

                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-200">
                    <Bookmark className="h-3.5 w-3.5" /> {activeSlide.fact.likes} base likes
                  </span>
                </div>
              </motion.article>

              {slideCount > 1 ? (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {carouselSlides.map((slide, index) => (
                    <button
                      key={`slide-dot-${slide.fact.id}-${index}`}
                      type="button"
                      aria-label={`Open slide ${index + 1}`}
                      onClick={() => setCurrentSlide(index)}
                      className={cx(
                        "h-2.5 rounded-full transition-all",
                        index === activeSlideIndex ? "w-7 bg-violet-500" : "w-2.5 bg-violet-300/55 hover:bg-violet-400/75"
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="grid gap-3 lg:grid-cols-[0.9fr_2.1fr]">
            <article className="glass rounded-[22px] border border-cyan-300/35 bg-gradient-to-br from-cyan-100/75 via-white/80 to-violet-100/55 p-4 dark:border-cyan-400/25 dark:bg-white/5">
              <h2 className="font-sora text-lg font-semibold text-[var(--text-primary)]">Latest Activity</h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">What you interacted with most recently.</p>
              <div className="mt-3 space-y-2">
                {factActivity.slice(0, 6).length ? (
                  factActivity.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-xl border border-black/8 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{item.factTitle}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{item.action} • {item.category}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">No activity yet. Like or save a fact to populate this feed.</p>
                )}
              </div>
            </article>

            <article className="space-y-2">
              <h2 className="font-sora text-lg font-semibold text-[var(--text-primary)]">Knowledge Library</h2>
              <p className="text-xs text-[var(--text-secondary)]">Browse all facts under the current filter with instant save and like actions.</p>
              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
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
              />
            ))}
              </div>
            </article>
          </section>
        </div>
      </motion.main>
    </div>
  );
}

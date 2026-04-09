"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Bookmark, SkipForward } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { TriviaFact } from "@/lib/types";
import { cx } from "@/lib/utils";
import { useTriviaFactsStore } from "@/lib/triviaFactsStore";
import { useNotificationStore } from "@/lib/notificationStore";

interface FactCardProps {
  fact?: TriviaFact;
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onSave?: () => void;
  onNext?: () => void;
  dynamic?: boolean;
  featured?: boolean;
}

interface DynamicFact {
  id: string;
  title: string;
  body: string;
  category: string;
}

const fallbackDynamicFacts: DynamicFact[] = [
  {
    id: "fallback-fact-1",
    title: "Honey Never Spoils",
    body: "Archaeologists have discovered pots of honey in ancient Egyptian tombs that are still edible after thousands of years.",
    category: "Fun Fact",
  },
  {
    id: "fallback-fact-2",
    title: "Octopuses Have Three Hearts",
    body: "Two hearts pump blood to the gills and one pumps it to the rest of the body.",
    category: "Fun Fact",
  },
  {
    id: "fallback-fact-3",
    title: "Bananas Are Berries",
    body: "Botanically, bananas qualify as berries, while strawberries do not.",
    category: "Fun Fact",
  },
  {
    id: "fallback-fact-4",
    title: "Sharks Keep Growing",
    body: "Some shark species continue to grow slowly throughout most of their lives.",
    category: "Fun Fact",
  },
];

const buildHeadline = (text: string) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Random Fact";

  const firstSentence = cleaned.split(/[.!?]/)[0] ?? cleaned;
  const words = firstSentence.split(" ").slice(0, 6);
  const headline = words.join(" ").trim();

  if (!headline) return "Random Fact";
  return headline.length > 72 ? `${headline.slice(0, 69)}...` : headline;
};

export default function FactCard({
  fact,
  liked = false,
  saved = false,
  onLike,
  onSave,
  onNext,
  dynamic = false,
  featured,
}: FactCardProps) {
  const [factQueue, setFactQueue] = useState<DynamicFact[]>(fallbackDynamicFacts);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(dynamic);
  const { likedFactIds, savedFactIds, toggleLike, toggleSave } = useTriviaFactsStore();
  const { pushNotification } = useNotificationStore();

  const dynamicFact = factQueue[activeIndex] ?? fallbackDynamicFacts[0];
  const queuePreview = useMemo(() => factQueue.filter((_, index) => index !== activeIndex).slice(0, 3), [activeIndex, factQueue]);

  const displayedStaticFact: TriviaFact =
    fact ?? {
      id: "fallback-static",
      category: "Science",
      title: fallbackDynamicFacts[0].title,
      body: fallbackDynamicFacts[0].body,
      likes: 0,
    };

  const fetchRandomFact = useCallback(async () => {
    if (!dynamic) return;

    setIsLoading(true);

    try {
      const response = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Fact request failed");

      const payload = (await response.json()) as { id?: string; text?: string; source?: string };
      const body = payload.text?.trim() || fallbackDynamicFacts[0].body;

      const nextFact: DynamicFact = {
        id: payload.id || `remote-${Date.now()}`,
        title: buildHeadline(body),
        body,
        category: payload.source || "Live API",
      };

      setFactQueue((current) => {
        const deduped = [nextFact, ...current.filter((item) => item.id !== nextFact.id)];
        return deduped.slice(0, 8);
      });
      setActiveIndex(0);
    } catch {
      setFactQueue((current) => (current.length ? current : fallbackDynamicFacts));
      setActiveIndex(0);
    } finally {
      setIsLoading(false);
    }
  }, [dynamic]);

  useEffect(() => {
    if (!dynamic) return;
    void fetchRandomFact();
  }, [dynamic, fetchRandomFact]);

  const activeDynamicId = dynamicFact.id;
  const dynamicSnapshot = {
    id: dynamicFact.id,
    title: dynamicFact.title,
    body: dynamicFact.body,
    category: dynamicFact.category,
  };
  const likedFacts = useMemo(() => new Set(likedFactIds), [likedFactIds]);
  const savedFacts = useMemo(() => new Set(savedFactIds), [savedFactIds]);
  const dynamicLiked = likedFacts.has(activeDynamicId);
  const dynamicSaved = savedFacts.has(activeDynamicId);

  const toggleDynamicLike = () => {
    toggleLike(activeDynamicId, dynamicSnapshot);
    pushNotification(dynamicLiked ? "Removed like from fact." : "Liked fact.", "success");
  };

  const toggleDynamicSave = () => {
    toggleSave(activeDynamicId, dynamicSnapshot);
    pushNotification(dynamicSaved ? "Removed saved fact." : "Fact saved.", "info");
  };

  const handleStaticLike = () => {
    onLike?.();
    if (displayedStaticFact.id !== "fallback-static") {
      pushNotification(liked ? "Removed like from fact." : "Liked fact.", "success");
    }
  };

  const handleStaticSave = () => {
    onSave?.();
    if (displayedStaticFact.id !== "fallback-static") {
      pushNotification(saved ? "Removed saved fact." : "Fact saved.", "info");
    }
  };

  const dynamicLikeCount = 1 + (dynamicLiked ? 1 : 0);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        "glass h-full rounded-[22px] border border-black/10 bg-gradient-to-br from-white/86 via-white/68 to-amber-100/22 p-4 shadow-[0_18px_34px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/74 dark:via-slate-900/54 dark:to-amber-900/20 dark:shadow-[0_20px_38px_rgba(2,8,25,0.42)]",
        featured && "border-amber-400/60 ring-1 ring-amber-400/25"
      )}
    >
      {featured ? (
        <span className="mb-2 inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-200">
          {dynamic ? "Fact of the Day" : "Today&apos;s Pick"}
        </span>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={dynamic ? `${dynamicFact.id}-${isLoading ? "loading" : "ready"}` : displayedStaticFact.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full border border-black/8 bg-black/5 px-2 py-0.5 text-xs text-[var(--text-secondary)] dark:border-white/15 dark:bg-black/30 dark:text-white/70">
              {dynamic ? dynamicFact.category : displayedStaticFact.category}
            </span>
          </div>

          {dynamic && isLoading ? (
            <div className="mb-4">
              <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">Loading...</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">Fetching a fresh random fact for you.</p>
            </div>
          ) : (
            <>
              <h3 className="mb-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                {dynamic ? dynamicFact.title : displayedStaticFact.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                {dynamic ? dynamicFact.body : displayedStaticFact.body}
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Like this fact"
          onClick={dynamic ? toggleDynamicLike : handleStaticLike}
          className={cx(
            "focus-ring arcade-btn flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs",
            (dynamic ? dynamicLiked : liked)
              ? "border-rose-400 bg-rose-500/20 text-rose-700 dark:text-rose-200"
              : "border-black/8 bg-white/70 text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5 dark:text-white/80"
          )}
        >
          <Heart className={cx("h-4 w-4", (dynamic ? dynamicLiked : liked) && "fill-current")} />
          {dynamic ? dynamicLikeCount : displayedStaticFact.likes + (liked ? 1 : 0)}
        </button>
        <button
          type="button"
          aria-label="Save this fact"
          onClick={dynamic ? toggleDynamicSave : handleStaticSave}
          className={cx(
            "focus-ring arcade-btn rounded-full border px-3 py-1.5 text-xs",
            (dynamic ? dynamicSaved : saved)
              ? "border-violet-400 bg-violet-500/20 text-violet-700 dark:text-violet-200"
              : "border-black/8 bg-white/70 text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5 dark:text-white/80"
          )}
        >
          <Bookmark className={cx("h-4 w-4", (dynamic ? dynamicSaved : saved) && "fill-current")} />
        </button>
        <button
          type="button"
          aria-label="Next fact"
          onClick={dynamic ? () => void fetchRandomFact() : onNext}
          disabled={dynamic && isLoading}
          className="focus-ring arcade-btn ml-auto flex items-center gap-1 rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
        >
          Next <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>

      {dynamic && queuePreview.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {queuePreview.map((queuedFact) => (
            <motion.button
              key={queuedFact.id}
              type="button"
              onClick={() => {
                const targetIndex = factQueue.findIndex((factItem) => factItem.id === queuedFact.id);
                if (targetIndex >= 0) setActiveIndex(targetIndex);
              }}
              className="rounded-card border border-black/8 bg-white/5 p-3 text-left transition-all hover:border-violet-400 dark:border-white/10 dark:bg-white/5"
            >
              <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Up Next</p>
              <p className="font-sora text-sm font-semibold text-[var(--text-primary)]">{queuedFact.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">{queuedFact.body}</p>
            </motion.button>
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}

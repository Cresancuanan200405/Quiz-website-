"use client";

import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconName } from "@/lib/types";
import {
  faFlask,
  faClapperboard,
  faLandmark,
  faLeaf,
  faUtensils,
  faPaw,
  faBriefcase,
  faMicrochip,
} from "@fortawesome/free-solid-svg-icons";

const iconMap = {
  flask: faFlask,
  landmark: faLandmark,
  microchip: faMicrochip,
  leaf: faLeaf,
  clapperboard: faClapperboard,
  utensils: faUtensils,
  paw: faPaw,
  briefcase: faBriefcase,
} as const;

interface CategoryCardProps {
  iconName: IconName;
  name: string;
  description?: string;
  difficulty: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
  hideDifficulty?: boolean;
  compact?: boolean;
}

const categoryDescriptionMap: Record<string, string> = {
  Science: "Experiments, discoveries, and wild science facts.",
  History: "Civilizations, wars, and moments that changed the world.",
  Tech: "Code, gadgets, and digital-era breakthroughs.",
  Nature: "Wildlife, ecosystems, and the planet's wonders.",
  Arts: "Music, films, literature, and visual masterpieces.",
  Anime: "Iconic characters, studios, and anime universes.",
  Food: "Cuisine, ingredients, and global food culture.",
  Animals: "Species, behavior, and fascinating creature trivia.",
  Business: "Markets, strategy, and entrepreneurial insights.",
};

export default function CategoryCard({
  iconName,
  name,
  description,
  difficulty,
  color,
  active,
  onClick,
  hideDifficulty,
  compact,
}: CategoryCardProps) {
  const icon = iconMap[iconName] ?? faFlask;
  const blurb = description ?? categoryDescriptionMap[name] ?? "Challenge yourself with a fresh set of curated questions.";

  return (
    <motion.button
      aria-label={`Open ${name} category`}
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className={`focus-ring glass arcade-btn w-full rounded-card border border-black/8 bg-gradient-to-br from-white/80 via-white/55 to-violet-100/35 text-left shadow-[0_14px_28px_rgba(15,23,42,0.11)] transition-all duration-200 dark:border-white/10 dark:from-slate-900/72 dark:via-slate-900/55 dark:to-violet-900/24 dark:shadow-[0_16px_32px_rgba(2,8,25,0.35)] ${compact ? "quiz-category-card p-2.5" : "p-4"}`}
      style={{
        boxShadow: active ? `0 14px 35px ${color}66` : undefined,
        borderColor: active ? color : undefined,
      }}
    >
      <div className={`flex items-center justify-between ${compact ? "mb-1.5" : "mb-3"}`}>
        <span className={`grid place-items-center rounded-full bg-violet-500/12 text-violet-700 dark:text-violet-200 ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
          <FontAwesomeIcon icon={icon} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        {!hideDifficulty && (
          <span className="rounded-full border border-black/8 bg-black/5 px-2 py-0.5 text-xs text-[var(--text-secondary)] dark:border-white/10 dark:bg-black/30 dark:text-white/75">
            {difficulty}
          </span>
        )}
      </div>
      <h3 className={`font-sora font-semibold text-[var(--text-primary)] ${compact ? "mb-1 text-sm" : "mb-1 text-lg"}`}>{name}</h3>
      <p
        className={`text-[var(--text-secondary)] ${compact ? "text-[11px] leading-snug" : "text-sm"}`}
        style={
          compact
            ? {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {blurb}
      </p>
    </motion.button>
  );
}

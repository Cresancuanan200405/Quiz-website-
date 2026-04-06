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
      className="focus-ring glass arcade-btn w-full rounded-card p-4 text-left"
      style={{
        boxShadow: active ? `0 14px 35px ${color}66` : undefined,
        borderColor: active ? color : undefined,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/12 text-violet-700 dark:text-violet-200">
          <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        </span>
        {!hideDifficulty && (
          <span className="rounded-full border border-black/8 bg-black/5 px-2 py-0.5 text-xs text-[var(--text-secondary)] dark:border-white/10 dark:bg-black/30 dark:text-white/75">
            {difficulty}
          </span>
        )}
      </div>
      <h3 className="mb-1 font-sora text-lg font-semibold text-[var(--text-primary)]">{name}</h3>
      <p className="text-sm text-[var(--text-secondary)]">{blurb}</p>
    </motion.button>
  );
}

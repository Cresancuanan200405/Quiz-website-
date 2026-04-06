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
  questionCount: number;
  difficulty: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
  hideDifficulty?: boolean;
}

export default function CategoryCard({
  iconName,
  name,
  questionCount,
  difficulty,
  color,
  active,
  onClick,
  hideDifficulty,
}: CategoryCardProps) {
  const icon = iconMap[iconName] ?? faFlask;

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
      <p className="text-sm text-[var(--text-secondary)]">{questionCount} questions</p>
    </motion.button>
  );
}

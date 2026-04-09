import { categoryMeta } from "@/lib/mockData";
import { getProgressionBadges } from "@/lib/quizProgression";
import type { PlayerQuizHistoryItem } from "@/lib/playerStatsStore";

export type AchievementRarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface AchievementRuntimeInput {
  quizzesCompleted: number;
  totalCorrectAnswers: number;
  bestStreak: number;
  totalPoints: number;
  battlesPlayed: number;
  wins: number;
  bestWinStreak: number;
  totalBattlePoints: number;
  quizHistory: PlayerQuizHistoryItem[];
}

export interface AchievementProgressItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  rarity: AchievementRarity;
}

const clamp = (value: number, min = 0) => Math.max(min, value);

export const buildAchievementProgress = (input: AchievementRuntimeInput): AchievementProgressItem[] => {
  const progressionBadges = getProgressionBadges(input.quizHistory, categoryMeta.map((category) => category.name));
  const masteredCategories = progressionBadges.filter((badge) => badge.endsWith("Grandmaster")).length;

  return [
    {
      id: "first-journey",
      title: "First Journey",
      description: "Complete your first Trivia Journey run.",
      progress: clamp(input.quizzesCompleted),
      goal: 1,
      rarity: "Common",
    },
    {
      id: "journey-hundred",
      title: "Century Scholar",
      description: "Answer 100 trivia questions correctly.",
      progress: clamp(input.totalCorrectAnswers),
      goal: 100,
      rarity: "Rare",
    },
    {
      id: "streak-master",
      title: "Streak Master",
      description: "Reach a best trivia streak of 15.",
      progress: clamp(input.bestStreak),
      goal: 15,
      rarity: "Epic",
    },
    {
      id: "points-collector",
      title: "Point Collector",
      description: "Earn 10,000 total Trivia Journey points.",
      progress: clamp(input.totalPoints),
      goal: 10000,
      rarity: "Epic",
    },
    {
      id: "battle-initiate",
      title: "Battle Initiate",
      description: "Finish your first 1v1 battle.",
      progress: clamp(input.battlesPlayed),
      goal: 1,
      rarity: "Common",
    },
    {
      id: "battle-victor",
      title: "Battle Victor",
      description: "Win 10 battles in the arena.",
      progress: clamp(input.wins),
      goal: 10,
      rarity: "Rare",
    },
    {
      id: "battle-hotstreak",
      title: "Unbreakable",
      description: "Reach a best battle win streak of 5.",
      progress: clamp(input.bestWinStreak),
      goal: 5,
      rarity: "Epic",
    },
    {
      id: "battle-points",
      title: "Arena Banker",
      description: "Accumulate 5,000 1v1 battle points.",
      progress: clamp(input.totalBattlePoints),
      goal: 5000,
      rarity: "Rare",
    },
    {
      id: "category-mastery",
      title: "Category Grandmasters",
      description: "Fully master categories across all difficulties.",
      progress: clamp(masteredCategories),
      goal: categoryMeta.length,
      rarity: "Legendary",
    },
  ];
};

export const getUnlockedAchievements = (items: AchievementProgressItem[]) => items.filter((item) => item.progress >= item.goal);

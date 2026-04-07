import type { PlayerQuizHistoryItem } from "@/lib/playerStatsStore";
import type { Difficulty } from "@/lib/types";

export const questionCountOptions = [5, 10, 15, 20, 25, 30] as const;

const allDifficulties: Difficulty[] = ["Easy", "Medium", "Hard"];

const recordPassed = (record: PlayerQuizHistoryItem) => record.passed || record.correct >= record.total;

export const getPassedQuestionCounts = (history: PlayerQuizHistoryItem[], category?: string | null, difficulty?: Difficulty | null) => {
  const passedCounts = new Set<number>();

  history.forEach((record) => {
    if (category && record.category !== category) return;
    if (difficulty && record.difficulty !== difficulty) return;
    if (!recordPassed(record)) return;
    passedCounts.add(record.total);
  });

  return passedCounts;
};

export const hasClearedDifficulty = (history: PlayerQuizHistoryItem[], category: string, difficulty: Difficulty) => {
  const passedCounts = getPassedQuestionCounts(history, category, difficulty);
  return questionCountOptions.every((count) => passedCounts.has(count));
};

export const getUnlockedDifficultiesForCategory = (history: PlayerQuizHistoryItem[], category?: string | null) => {
  if (!category) {
    return {
      Easy: true,
      Medium: false,
      Hard: false,
    } as const;
  }

  const easyCleared = hasClearedDifficulty(history, category, "Easy");
  const mediumCleared = hasClearedDifficulty(history, category, "Medium");

  return {
    Easy: true,
    Medium: easyCleared,
    Hard: mediumCleared,
  } as const;
};

export const getProgressionBadges = (history: PlayerQuizHistoryItem[], categories: string[]) => {
  const badges: string[] = [];
  let fullyMasteredCategoryCount = 0;

  categories.forEach((category) => {
    const categoryCleared = allDifficulties.every((difficulty) => hasClearedDifficulty(history, category, difficulty));
    if (categoryCleared) {
      fullyMasteredCategoryCount += 1;
      badges.push(`${category} Grandmaster`);
    }
  });

  if (categories.length > 0 && fullyMasteredCategoryCount === categories.length) {
    badges.push("Ultimate Quiz Conqueror");
  }

  return badges;
};

import type { AnswerRecord, LeaderboardUser } from "@/lib/types";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const toPercent = (value: number, total: number) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

export const calculatePoints = (records: AnswerRecord[]) => {
  return records.reduce((acc, record) => {
    if (!record.isCorrect) return acc;
    const timeBonus = clamp(20 - record.timeSpent, 0, 20);
    return acc + 100 + timeBonus * 3;
  }, 0);
};

export const getAverageTime = (records: AnswerRecord[]) => {
  if (!records.length) return 0;
  const total = records.reduce((sum, r) => sum + r.timeSpent, 0);
  return Number((total / records.length).toFixed(1));
};

export const medalForRank = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

export const sortByScore = (users: LeaderboardUser[]) =>
  [...users].sort((a, b) => b.score - a.score);

export const cx = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");

import { leaderboardUsers } from "@/lib/mockData";
import type { LeaderboardUser } from "@/lib/types";

export interface RuntimePlayerStats {
  quizzesCompleted: number;
  totalCorrectAnswers: number;
  totalAnsweredQuestions: number;
  totalPoints: number;
}

export interface RuntimePlayerIdentity {
  id?: string;
  username?: string;
  avatar?: string;
  baseAccuracy?: number;
  baseQuizCount?: number;
  baseScore?: number;
}

const deriveTier = (score: number): LeaderboardUser["tier"] => {
  if (score >= 16000) return "Legendary";
  if (score >= 14500) return "Expert";
  if (score >= 12500) return "Pro";
  return "Rising";
};

const deriveCurrentUserRow = (stats: RuntimePlayerStats, identity?: RuntimePlayerIdentity): LeaderboardUser => {
  const baseAccuracy = Math.max(0, identity?.baseAccuracy ?? 0);
  const baseQuizCount = Math.max(0, identity?.baseQuizCount ?? 0);
  const baseScore = Math.max(0, identity?.baseScore ?? 0);

  const baseQuestionCount = baseQuizCount * 10;
  const baseCorrectAnswers = Math.round((baseAccuracy / 100) * baseQuestionCount);
  const totalQuestions = baseQuestionCount + Math.max(0, stats.totalAnsweredQuestions);
  const totalCorrect = baseCorrectAnswers + Math.max(0, stats.totalCorrectAnswers);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : baseAccuracy;

  const quizCount = baseQuizCount + Math.max(0, stats.quizzesCompleted);
  const score = baseScore + Math.max(0, stats.totalPoints);

  return {
    id: identity?.id ?? "local-player",
    username: identity?.username ?? "You",
    avatar: identity?.avatar ?? "ME",
    score,
    accuracy,
    quizCount,
    rank: 0,
    tier: deriveTier(score),
  };
};

export const getRankedLeaderboard = (stats: RuntimePlayerStats, identity?: RuntimePlayerIdentity): LeaderboardUser[] => {
  const me = deriveCurrentUserRow(stats, identity);
  return [...leaderboardUsers.filter((user) => user.id !== me.id), me]
    .sort((a, b) => b.score - a.score)
    .map((user, index) => ({ ...user, rank: index + 1 }));
};

export const getLeaderboardUserById = (id: string, stats: RuntimePlayerStats, identity?: RuntimePlayerIdentity): LeaderboardUser | null => {
  return getRankedLeaderboard(stats, identity).find((user) => user.id === id) ?? null;
};

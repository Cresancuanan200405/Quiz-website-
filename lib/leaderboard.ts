import { currentUser, leaderboardUsers } from "@/lib/mockData";
import type { LeaderboardUser } from "@/lib/types";

export interface RuntimePlayerStats {
  quizzesCompleted: number;
  totalCorrectAnswers: number;
  totalAnsweredQuestions: number;
  totalPoints: number;
}

const deriveTier = (score: number): LeaderboardUser["tier"] => {
  if (score >= 16000) return "Legendary";
  if (score >= 14500) return "Expert";
  if (score >= 12500) return "Pro";
  return "Rising";
};

const deriveCurrentUserRow = (stats: RuntimePlayerStats): LeaderboardUser => {
  const baseQuestionCount = currentUser.quizCount * 10;
  const baseCorrectAnswers = Math.round((currentUser.accuracy / 100) * baseQuestionCount);
  const totalQuestions = baseQuestionCount + Math.max(0, stats.totalAnsweredQuestions);
  const totalCorrect = baseCorrectAnswers + Math.max(0, stats.totalCorrectAnswers);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : currentUser.accuracy;

  const quizCount = currentUser.quizCount + Math.max(0, stats.quizzesCompleted);
  const score = currentUser.score + Math.max(0, stats.totalPoints);

  return {
    id: currentUser.id,
    username: currentUser.username,
    avatar: currentUser.avatar,
    score,
    accuracy,
    quizCount,
    rank: 0,
    tier: deriveTier(score),
  };
};

export const getRankedLeaderboard = (stats: RuntimePlayerStats): LeaderboardUser[] => {
  const me = deriveCurrentUserRow(stats);
  return [...leaderboardUsers.filter((user) => user.id !== currentUser.id), me]
    .sort((a, b) => b.score - a.score)
    .map((user, index) => ({ ...user, rank: index + 1 }));
};

export const getLeaderboardUserById = (id: string, stats: RuntimePlayerStats): LeaderboardUser | null => {
  return getRankedLeaderboard(stats).find((user) => user.id === id) ?? null;
};

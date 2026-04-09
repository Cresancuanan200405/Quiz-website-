import { currentUser, leaderboardUsers } from "@/lib/mockData";
import type { RuntimePlayerStats } from "@/lib/leaderboard";

export interface DashboardPreviewEntry {
  id: string;
  username: string;
  avatar: string;
  points: number;
  rank: number;
  rankLabel: string;
  accuracy: number;
  activityCount: number;
}

export interface DashboardProfileIdentity {
  displayName: string;
  avatar: string;
}

export interface RuntimeBattleStats {
  battlesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalBattlePoints: number;
  totalScoreFor: number;
  totalScoreAgainst: number;
}

const getJourneyTier = (points: number) => {
  if (points >= 16000) return "Legendary";
  if (points >= 14500) return "Expert";
  if (points >= 12500) return "Pro";
  return "Rising";
};

const getBattleTier = (points: number) => {
  if (points >= 9800) return "Legendary";
  if (points >= 8200) return "Expert";
  if (points >= 6400) return "Pro";
  return "Rising";
};

export const getTriviaJourneyLeaderboardPreview = (
  stats: RuntimePlayerStats,
  profile: DashboardProfileIdentity,
  limit = 5
): DashboardPreviewEntry[] => {
  const baseQuestionCount = currentUser.quizCount * 10;
  const baseCorrectAnswers = Math.round((currentUser.accuracy / 100) * baseQuestionCount);
  const totalQuestions = baseQuestionCount + Math.max(0, stats.totalAnsweredQuestions);
  const totalCorrect = baseCorrectAnswers + Math.max(0, stats.totalCorrectAnswers);

  const me: DashboardPreviewEntry = {
    id: currentUser.id,
    username: profile.displayName,
    avatar: profile.avatar,
    points: currentUser.score + Math.max(0, stats.totalPoints),
    rank: 0,
    rankLabel: getJourneyTier(currentUser.score + Math.max(0, stats.totalPoints)),
    accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : currentUser.accuracy,
    activityCount: currentUser.quizCount + Math.max(0, stats.quizzesCompleted),
  };

  return [...leaderboardUsers.filter((user) => user.id !== currentUser.id), me]
    .map((user) => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      points: user.score,
      rank: user.rank,
      rankLabel: user.tier,
      accuracy: user.accuracy,
      activityCount: user.quizCount,
    }))
    .map((entry) => (entry.id === currentUser.id ? me : entry))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, limit);
};

export const getBattleLeaderboardPreview = (
  battle: RuntimeBattleStats,
  profile: DashboardProfileIdentity,
  limit = 5
): DashboardPreviewEntry[] => {
  const meWinRate = battle.battlesPlayed > 0 ? Math.round((battle.wins / battle.battlesPlayed) * 100) : 0;
  const meBasePoints = 5200;
  const mePoints = meBasePoints + Math.max(0, battle.totalBattlePoints);

  const me: DashboardPreviewEntry = {
    id: currentUser.id,
    username: profile.displayName,
    avatar: profile.avatar,
    points: mePoints,
    rank: 0,
    rankLabel: getBattleTier(mePoints),
    accuracy: meWinRate,
    activityCount: battle.battlesPlayed,
  };

  const seededBattleRows: DashboardPreviewEntry[] = leaderboardUsers.map((user) => {
    const derivedPoints = Math.round(user.score * 0.58 + user.quizCount * 6);
    const battles = Math.max(18, Math.round(user.quizCount * 0.75));
    const winRate = Math.max(45, Math.min(97, user.accuracy - 6));

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      points: derivedPoints,
      rank: 0,
      rankLabel: getBattleTier(derivedPoints),
      accuracy: winRate,
      activityCount: battles,
    };
  });

  return [...seededBattleRows.filter((user) => user.id !== currentUser.id), me]
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, limit);
};

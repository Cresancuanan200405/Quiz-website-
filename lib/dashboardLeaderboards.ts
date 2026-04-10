import { leaderboardUsers } from "@/lib/mockData";
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
  profileKey?: string;
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
  const totalQuestions = Math.max(0, stats.totalAnsweredQuestions);
  const totalCorrect = Math.max(0, stats.totalCorrectAnswers);
  const meId = profile.profileKey ?? "local-player";

  const me: DashboardPreviewEntry = {
    id: meId,
    username: profile.displayName,
    avatar: profile.avatar,
    points: Math.max(0, stats.totalPoints),
    rank: 0,
    rankLabel: getJourneyTier(Math.max(0, stats.totalPoints)),
    accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    activityCount: Math.max(0, stats.quizzesCompleted),
  };

  const seededTriviaRows: DashboardPreviewEntry[] = leaderboardUsers
    .filter((user) => user.id !== me.id)
    .map((user) => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      points: user.score,
      rank: user.rank,
      rankLabel: user.tier,
      accuracy: user.accuracy,
      activityCount: user.quizCount,
    }));

  return [...seededTriviaRows, me]
    .map((entry) => (entry.id === me.id ? me : entry))
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
  const meId = profile.profileKey ?? "local-player";

  const me: DashboardPreviewEntry = {
    id: meId,
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

  return [...seededBattleRows.filter((user) => user.id !== me.id), me]
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, limit);
};

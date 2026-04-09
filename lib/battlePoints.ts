export interface BattlePointsInput {
  result: "win" | "loss" | "draw";
  userScore: number;
  opponentScore: number;
}

export const scoreBattlePoints = (record: BattlePointsInput) => {
  const margin = record.userScore - record.opponentScore;
  const base = record.result === "win" ? 120 : record.result === "draw" ? 70 : 35;
  const marginBonus = record.result === "win" ? Math.max(0, margin) * 2 : 0;
  const performanceBonus = Math.max(0, Math.round(Math.max(0, record.userScore) * (record.result === "loss" ? 0.05 : 0.12)));
  return Math.max(20, base + marginBonus + performanceBonus);
};

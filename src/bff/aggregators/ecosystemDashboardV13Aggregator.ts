/**
 * 健澜科技 jlmedaios - 知识贡献生态总览 V13 纯函数（M298-D）
 *
 * buildEcosystemDashboardV13 / computeEcosystemHealthV13 / identifyEcosystemGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 榜单条目（精简） */
export interface EcoEntryV13 {
  doctorId: string;
  name: string;
  score: number;
}

/** 师徒对 */
export interface MentorPairV13 {
  mentorId: string;
  newDoctorId: string;
  dept: string;
}

/** 生态总览 */
export interface EcosystemDashboardV13 {
  totalContributors: number;
  monthlyStars: number;
  activeMentorPairs: number;
  newDoctorCount: number;
}

/**
 * 生态总览（纯函数）。
 *
 * @param leaderboard 贡献榜
 * @param monthlyStarCount 月度之星数
 * @param pairs 师徒对
 * @param newDoctors 新医生列表
 * @returns 总览
 */
export function buildEcosystemDashboardV13(
  leaderboard: EcoEntryV13[],
  monthlyStarCount: number,
  pairs: MentorPairV13[],
  newDoctors: EcoEntryV13[],
): EcosystemDashboardV13 {
  return {
    totalContributors: leaderboard.length,
    monthlyStars: monthlyStarCount,
    activeMentorPairs: pairs.length,
    newDoctorCount: newDoctors.length,
  };
}

/**
 * 生态健康分（纯函数）：活跃贡献者占比×0.4 + 师徒对数×0.3 + 月度之星覆盖×0.3，0-100。
 *
 * @param dashboard 总览
 * @returns 健康分
 */
export function computeEcosystemHealthV13(dashboard: EcosystemDashboardV13): number {
  const contribPart = Math.min(100, dashboard.totalContributors * 10) * 0.4;
  const pairPart = Math.min(100, dashboard.activeMentorPairs * 20) * 0.3;
  const starPart = Math.min(100, dashboard.monthlyStars * 50) * 0.3;
  return Math.round(contribPart + pairPart + starPart);
}

/**
 * 缺口识别（纯函数）：有新医生但没师徒对 → "导师稀缺"。
 *
 * @param dashboard 总览
 * @returns 缺口描述（无则空串）
 */
export function identifyEcosystemGapV13(dashboard: EcosystemDashboardV13): string {
  if (dashboard.newDoctorCount > 0 && dashboard.activeMentorPairs === 0) {
    return "导师稀缺：有新医生但无师徒对";
  }
  if (dashboard.totalContributors < 3) {
    return "贡献者不足：生态冷清";
  }
  return "";
}

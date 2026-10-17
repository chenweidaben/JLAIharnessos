/**
 * 健澜科技 jlmedaios - MUSE 采纳率与使用度量 V5 纯函数（M285-A）
 *
 * calculateAdoptionRateV5 / estimateTimeSavedV5 / rankSkillsV5 / buildMuseValueV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 使用度量 */
export interface UsageMetric {
  role: string;
  skill: string;
  sessionCount: number;
  adopted: number;
  rejected: number;
  timeSavedMin: number;
}

/**
 * 采纳率 V5（纯函数）：adopted/(adopted+rejected)。
 *
 * @param adopted 采纳数
 * @param total 总数
 * @returns 采纳率%
 */
export function calculateAdoptionRateV5(adopted: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((adopted / total) * 1000) / 10;
}

/**
 * 节省时间估算 V5（纯函数）：次数×每次节省。
 *
 * @param actions 次数
 * @param avgMinutesEach 每次平均节省分钟
 * @returns 总节省小时
 */
export function estimateTimeSavedV5(actions: number, avgMinutesEach: number): number {
  return Math.round(((actions * avgMinutesEach) / 60) * 10) / 10;
}

/**
 * 技能排行 V5（纯函数）：按采纳率降序。
 *
 * @param metrics 度量列表
 * @returns 排行
 */
export function rankSkillsV5(metrics: UsageMetric[]): { skill: string; adoptionRate: number; timeSavedMin: number }[] {
  return metrics
    .map((m) => ({
      skill: m.skill,
      adoptionRate: calculateAdoptionRateV5(m.adopted, m.adopted + m.rejected),
      timeSavedMin: m.timeSavedMin,
    }))
    .sort((a, b) => b.adoptionRate - a.adoptionRate);
}

/** 价值看板输出 */
export interface MuseValueV5Report {
  totalSessions: number;
  overallAdoptionRate: number;
  totalTimeSavedHours: number;
  topSkill: string;
}

/**
 * 构建价值看板（纯函数）。
 *
 * @param metrics 度量列表
 * @returns 看板
 */
export function buildMuseValueV5Report(metrics: UsageMetric[]): MuseValueV5Report {
  const totalSessions = metrics.reduce((s, m) => s + m.sessionCount, 0);
  const totalAdopted = metrics.reduce((s, m) => s + m.adopted, 0);
  const totalDecisions = metrics.reduce((s, m) => s + m.adopted + m.rejected, 0);
  const totalTimeSavedMin = metrics.reduce((s, m) => s + m.timeSavedMin, 0);
  const ranked = rankSkillsV5(metrics);
  return {
    totalSessions,
    overallAdoptionRate: calculateAdoptionRateV5(totalAdopted, totalDecisions),
    totalTimeSavedHours: Math.round((totalTimeSavedMin / 60) * 10) / 10,
    topSkill: ranked[0]?.skill ?? "—",
  };
}

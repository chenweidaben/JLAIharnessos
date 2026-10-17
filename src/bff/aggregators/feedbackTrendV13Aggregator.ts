/**
 * 健澜科技 jlmedaios - 反馈信号看板与趋势 V13 纯函数（M301-C）
 *
 * aggregateWeeklyFeedbackV13 / computeFeedbackTrendV13 / identifyFeedbackRiskV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 周反馈聚合 */
export interface WeeklyFeedbackV13 {
  weekLabel: string;
  adoptionRate: number;
  modificationRate: number;
  rejectionRate: number;
}

/** 周环比 */
export interface FeedbackTrendV13 {
  adoptionDelta: number;
  modificationDelta: number;
  rejectionDelta: number;
}

/**
 * 周聚合（纯函数）：按 weekLabel 分组，三率百分比保留1位。
 *
 * @param weekly 周反馈数据
 * @returns 聚合后的周数据（已按 weekLabel 升序）
 */
export function aggregateWeeklyFeedbackV13(weekly: WeeklyFeedbackV13[]): WeeklyFeedbackV13[] {
  return [...weekly].sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));
}

/**
 * 周环比（纯函数）：this - last，保留1位。
 *
 * @param thisWeek 本周
 * @param lastWeek 上周
 * @returns 环比 delta
 */
export function computeFeedbackTrendV13(
  thisWeek: WeeklyFeedbackV13,
  lastWeek: WeeklyFeedbackV13,
): FeedbackTrendV13 {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    adoptionDelta: round1(thisWeek.adoptionRate - lastWeek.adoptionRate),
    modificationDelta: round1(thisWeek.modificationRate - lastWeek.modificationRate),
    rejectionDelta: round1(thisWeek.rejectionRate - lastWeek.rejectionRate),
  };
}

/**
 * 风险识别（纯函数）：最后一周采纳率<上一周 → "MUSE 表现恶化"；最后一周驳回率>30 → "建议复训"。
 *
 * @param weekly 周聚合数据（至少2周）
 * @returns 风险描述（无则空串）
 */
export function identifyFeedbackRiskV13(weekly: WeeklyFeedbackV13[]): string {
  if (weekly.length >= 2) {
    const last = weekly[weekly.length - 1];
    const prev = weekly[weekly.length - 2];
    if (last.adoptionRate < prev.adoptionRate) {
      return "MUSE 表现恶化：采纳率连续下降";
    }
  }
  if (weekly.length >= 1) {
    const last = weekly[weekly.length - 1];
    if (last.rejectionRate > 30) {
      return "建议复训：驳回率超过30%";
    }
  }
  return "";
}

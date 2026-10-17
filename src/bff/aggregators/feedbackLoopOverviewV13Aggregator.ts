/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V13 纯函数（M301-D）
 *
 * buildFeedbackLoopOverviewV13 / computeLoopMaturityV13 / identifyLoopGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 闭环总览 */
export interface FeedbackLoopOverviewV13 {
  totalFeedbacks: number;
  appliedPatches: number;
  pendingPatches: number;
  avgAdoptionRate: number;
  trendDirection: "improving" | "stable" | "worsening";
}

/**
 * 闭环总览（纯函数）。
 *
 * @param totalFeedbacks 反馈总数
 * @param appliedPatches 已应用补丁数
 * @param pendingPatches 待应用补丁数
 * @param avgAdoptionRate 平均采纳率%
 * @param lastAdoptionRate 最近一周采纳率
 * @param prevAdoptionRate 上一周采纳率
 * @returns 总览
 */
export function buildFeedbackLoopOverviewV13(
  totalFeedbacks: number,
  appliedPatches: number,
  pendingPatches: number,
  avgAdoptionRate: number,
  lastAdoptionRate: number,
  prevAdoptionRate: number,
): FeedbackLoopOverviewV13 {
  let trendDirection: FeedbackLoopOverviewV13["trendDirection"] = "stable";
  if (lastAdoptionRate > prevAdoptionRate) trendDirection = "improving";
  else if (lastAdoptionRate < prevAdoptionRate) trendDirection = "worsening";
  return {
    totalFeedbacks,
    appliedPatches,
    pendingPatches,
    avgAdoptionRate,
    trendDirection,
  };
}

/**
 * 闭环成熟度（纯函数）：反馈量×0.3 + 采纳率×0.4 + 补丁应用率×0.3，0-100。
 *
 * @param overview 总览
 * @returns 成熟度分
 */
export function computeLoopMaturityV13(overview: FeedbackLoopOverviewV13): number {
  const feedbackPart = Math.min(100, overview.totalFeedbacks * 2) * 0.3;
  const adoptionPart = Math.min(100, overview.avgAdoptionRate) * 0.4;
  const totalPatches = overview.appliedPatches + overview.pendingPatches;
  const patchRate = totalPatches === 0
    ? 0
    : Math.round((overview.appliedPatches / totalPatches) * 100);
  const patchPart = Math.min(100, patchRate) * 0.3;
  return Math.round(feedbackPart + adoptionPart + patchPart);
}

/**
 * 闭环缺口识别（纯函数）：补丁应用率<50 → "医生修改未有效沉淀"；反馈量<20 → "反馈采集不足"。
 *
 * @param overview 总览
 * @returns 缺口描述（无则空串）
 */
export function identifyLoopGapV13(overview: FeedbackLoopOverviewV13): string {
  const totalPatches = overview.appliedPatches + overview.pendingPatches;
  if (totalPatches > 0) {
    const patchRate = overview.appliedPatches / totalPatches;
    if (patchRate < 0.5) {
      return "医生修改未有效沉淀：补丁应用率<50%";
    }
  }
  if (overview.totalFeedbacks < 20) {
    return "反馈采集不足：反馈量<20";
  }
  return "";
}

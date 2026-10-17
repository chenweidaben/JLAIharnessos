/**
 * 健澜科技 jlmedaios - 院长季度复盘报告 V13 纯函数（M310-D）
 *
 * buildQuarterlyReviewV13 / computeKpiAchievementRateV13 / generateNextQuarterSuggestionsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 季度 KPI */
export interface QuarterlyKpiV13 {
  name: string;
  actual: number;
  target: number;
}

/** 季度报告 */
export interface QuarterlyReviewV13 {
  quarter: string;
  kpiAchievementRate: number;
  highlights: string[];
  gaps: string[];
}

/**
 * KPI 达成率（纯函数）：实际/目标×100 平均。
 *
 * @param kpis KPI 列表
 * @returns 达成率整数
 */
export function computeKpiAchievementRateV13(kpis: QuarterlyKpiV13[]): number {
  if (kpis.length === 0) return 0;
  const rates = kpis.map((k) => (k.target === 0 ? 0 : Math.round((k.actual / k.target) * 100)));
  return Math.round(rates.reduce((s, r) => s + r, 0) / rates.length);
}

/**
 * 构建季度报告（纯函数）。
 *
 * @param quarter 季度 YYYY-Qn
 * @param kpis KPI
 * @param highlights 亮点
 * @param gaps 短板
 * @returns 季度报告
 */
export function buildQuarterlyReviewV13(
  quarter: string,
  kpis: QuarterlyKpiV13[],
  highlights: string[],
  gaps: string[],
): QuarterlyReviewV13 {
  return {
    quarter,
    kpiAchievementRate: computeKpiAchievementRateV13(kpis),
    highlights,
    gaps,
  };
}

/**
 * 下季度建议（纯函数）：按短板维度映射动作。
 *
 * @param review 季度报告
 * @returns 建议列表
 */
export function generateNextQuarterSuggestionsV13(review: QuarterlyReviewV13): string[] {
  return review.gaps.map((g) => `下季度重点改进：${g}`);
}

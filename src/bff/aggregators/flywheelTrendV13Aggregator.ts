/**
 * 健澜科技 jlmedaios - 飞轮季度演进趋势 V13 纯函数（M306-D）
 *
 * buildQuarterlyFlywheelTrendV13 / computeQuarterlyGrowthV13 / identifyFlywheelMomentumV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 季度得分 */
export interface QuarterlyScoreV13 {
  quarter: string;
  score: number;
}

/**
 * 季度趋势（纯函数）：直接透传。
 *
 * @param quarterlyScores 季度得分列表
 * @returns 趋势
 */
export function buildQuarterlyFlywheelTrendV13(quarterlyScores: QuarterlyScoreV13[]): QuarterlyScoreV13[] {
  return quarterlyScores.map((q) => ({ quarter: q.quarter, score: q.score }));
}

/**
 * 季度环比增长（纯函数）：thisQ - lastQ，保留1位。
 *
 * @param thisQ 本季
 * @param lastQ 上季
 * @returns 环比 pp
 */
export function computeQuarterlyGrowthV13(thisQ: number, lastQ: number): number {
  return Math.round((thisQ - lastQ) * 10) / 10;
}

/**
 * 动能识别（纯函数）：连续两季增长→"飞轮加速"；连续两季下降→"飞轮失速"；否则"波动"。
 *
 * @param trend 趋势
 * @returns 动能描述
 */
export function identifyFlywheelMomentumV13(trend: QuarterlyScoreV13[]): string {
  if (trend.length < 3) return "数据不足";
  const g1 = trend[1].score - trend[0].score;
  const g2 = trend[2].score - trend[1].score;
  if (g1 > 0 && g2 > 0) return "飞轮加速";
  if (g1 < 0 && g2 < 0) return "飞轮失速";
  return "波动";
}

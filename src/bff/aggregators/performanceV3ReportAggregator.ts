/**
 * 健澜科技 jlmedaios - 医院绩效管理 V3 纯函数（M240-C）
 *
 * buildPerformanceV3Report / calculatePerformanceScoreV3 / distributePerformanceV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算绩效得分 V3（纯函数）。
 *
 * @param indicators 指标
 * @param weights 权重
 * @returns 得分
 */
export function calculatePerformanceScoreV3(indicators: number[], weights: number[]): { score: number; level: string } {
  let score = 0;
  for (let i = 0; i < indicators.length; i++) {
    score += Math.round(indicators[i] * weights[i]);
  }
  let level = "合格";
  if (score >= 90) level = "优秀";
  else if (score >= 75) level = "良好";
  return { score, level };
}

/**
 * 分配绩效 V3（纯函数）。
 *
 * @param total 总额
 * @param scores 得分
 * @param positions 岗位
 * @returns 分配
 */
export function distributePerformanceV3(total: number, scores: number[], positions: string[]): { name: string; amount: number }[] {
  return positions.map((p, i) => ({ name: p, amount: Math.round((total * scores[i]) / 100) }));
}

/** 绩效 V3 报告输出 */
export interface PerformanceV3Report {
  timeRange: string;
  national: { indicators: number; rank: number };
  dept: { quality: number; quantity: number; efficiency: number };
  individual: { doctor: number; nurse: number; tech: number; admin: number };
  drg: { cmi: number; dip: number };
  suggestions: string[];
}

/**
 * 构建绩效 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 绩效 V3 报告
 */
export function buildPerformanceV3Report(timeRange: string): PerformanceV3Report {
  return {
    timeRange,
    national: { indicators: 55, rank: 5 },
    dept: { quality: 90, quantity: 85, efficiency: 80 },
    individual: { doctor: 500, nurse: 400, tech: 150, admin: 100 },
    drg: { cmi: 1.2, dip: 8000 },
    suggestions: ["提升国考排名", "提高CMI值"],
  };
}

/**
 * 健澜科技 jlmedaios - 绩效管理 V4 纯函数（M250-C）
 *
 * buildPerformanceV4Report / calculatePerformanceScoreV4 / distributePerformanceV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算绩效得分 V4（纯函数）。
 *
 * @param indicators 指标
 * @param weights 权重
 * @returns 得分
 */
export function calculatePerformanceScoreV4(indicators: { quality: number; quantity: number; efficiency: number }, weights: { quality: number; quantity: number; efficiency: number }): { score: number; grade: string } {
  const score = Math.round((indicators.quality * weights.quality + indicators.quantity * weights.quantity + indicators.efficiency * weights.efficiency) * 10) / 10;
  let grade = "C";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  return { score, grade };
}

/**
 * 分配绩效 V4（纯函数）。
 *
 * @param total 总额
 * @param scores 得分
 * @param positions 岗位
 * @returns 分配
 */
export function distributePerformanceV4(total: number, scores: number[], positions: number[]): number[] {
  const totalWeight = scores.reduce((a, b, i) => a + b * (positions[i] ?? 1), 0);
  return scores.map((s, i) => Math.round((s * (positions[i] ?? 1) / Math.max(totalWeight, 1)) * total));
}

/** 绩效 V4 报告输出 */
export interface PerformanceV4Report {
  timeRange: string;
  national: { grade: string; target: number; completed: number };
  indicators: { quality: number; quantity: number; efficiency: number; satisfaction: number };
  workload: { doctor: number; nurse: number; medTech: number; admin: number };
  drg: { cmi: number; timeConsumption: number; costConsumption: number; balance: number };
  salary: { base: number; performance: number; annual: number; overtime: number };
  suggestions: string[];
}

/**
 * 构建绩效 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 绩效 V4 报告
 */
export function buildPerformanceV4Report(timeRange: string): PerformanceV4Report {
  return {
    timeRange,
    national: { grade: "B+", target: 80, completed: 85 },
    indicators: { quality: 90, quantity: 85, efficiency: 80, satisfaction: 88 },
    workload: { doctor: 5000, nurse: 8000, medTech: 3000, admin: 1000 },
    drg: { cmi: 1.2, timeConsumption: 0.9, costConsumption: 0.95, balance: 500 },
    salary: { base: 8000, performance: 5000, annual: 20000, overtime: 1000 },
    suggestions: ["提升质量指标", "优化 DRG 结构"],
  };
}

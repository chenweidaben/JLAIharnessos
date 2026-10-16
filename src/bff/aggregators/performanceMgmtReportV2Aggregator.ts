/**
 * 健澜科技 jlmedaios - 绩效管理 V2 纯函数（M226-D）
 *
 * buildPerformanceMgmtReportV2 / calculatePerformanceScore / distributePerformanceBonus
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算绩效得分（纯函数）。
 *
 * @param indicators 指标得分数组
 * @param weights 权重数组
 * @returns 加权总分
 */
export function calculatePerformanceScore(indicators: number[], weights: number[]): { score: number; grade: string } {
  let sum = 0;
  for (let i = 0; i < indicators.length; i++) {
    sum += indicators[i] * (weights[i] ?? 0);
  }
  const score = Math.round(sum * 10) / 10;
  let grade = 'C';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  return { score, grade };
}

/**
 * 分配绩效奖金（纯函数）。
 *
 * @param total 奖金总额
 * @param scores 各人得分
 * @returns 分配结果
 */
export function distributePerformanceBonus(total: number, scores: number[]): { distributed: number[] } {
  const sum = scores.reduce((a, b) => a + b, 0);
  const distributed = scores.map((s) => Math.round((total * (s / sum)) * 100) / 100);
  return { distributed };
}

/** 绩效管理 V2 报告输出 */
export interface PerformanceMgmtReportV2 {
  timeRange: string;
  hospital: { depts: number };
  dept: { evaluated: number };
  individual: { total: number };
  distribution: { bonus: number };
  cycle: { monthly: number; quarterly: number; yearly: number };
  feedback: { interviews: number };
  analysis: { merit: boolean };
  culture: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建绩效管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 绩效管理 V2 报告
 */
export function buildPerformanceMgmtReportV2(timeRange: string): PerformanceMgmtReportV2 {
  return {
    timeRange,
    hospital: { depts: 40 },
    dept: { evaluated: 40 },
    individual: { total: 2000 },
    distribution: { bonus: 5000000 },
    cycle: { monthly: 12, quarterly: 4, yearly: 1 },
    feedback: { interviews: 200 },
    analysis: { merit: true },
    culture: { satisfaction: 85 },
    suggestions: ['加大多劳多得导向', '优化绩效面谈'],
  };
}

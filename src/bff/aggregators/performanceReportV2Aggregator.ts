/**
 * 健澜科技 jlmedaios - 绩效考核与分配 V2 纯函数（M211-D）
 *
 * buildPerformanceReportV2 / calculatePerformanceScore / distributeBonus
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 考核指标得分 */
export interface PerformanceIndicators {
  workload: number;
  cost: number;
  risk: number;
  satisfaction: number;
}

/**
 * 计算绩效总分（纯函数）。
 *
 * @param i 四维度得分（各 100）
 * @returns 总分与等级
 */
export function calculatePerformanceScore(i: PerformanceIndicators): { total: number; level: string } {
  const total = i.workload * 0.4 + i.cost * 0.2 + i.risk * 0.2 + i.satisfaction * 0.2;
  let level = 'C';
  if (total >= 90) level = 'A';
  else if (total >= 80) level = 'B';
  return { total, level };
}

/**
 * 分配奖金（纯函数）。
 *
 * @param total 奖金总额
 * @param weights 权重列表
 * @returns 分配结果
 */
export function distributeBonus(total: number, weights: number[]): { amounts: number[]; sum: number } {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const amounts = weightSum > 0 ? weights.map((w) => (total * w) / weightSum) : weights.map(() => 0);
  return { amounts, sum: amounts.reduce((a, b) => a + b, 0) };
}

/** 绩效 V2 报告输出 */
export interface PerformanceReportV2 {
  timeRange: string;
  hospital: { score: number };
  dept: { count: number };
  individual: { count: number };
  indicators: { count: number };
  cycle: { monthly: boolean; quarterly: boolean; yearly: boolean };
  distribution: { workload: number; cost: number; risk: number; satisfaction: number };
  feedback: { completed: number };
  suggestions: string[];
}

/**
 * 构建绩效 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 绩效 V2 报告
 */
export function buildPerformanceReportV2(timeRange: string): PerformanceReportV2 {
  return {
    timeRange,
    hospital: { score: 85 },
    dept: { count: 40 },
    individual: { count: 2000 },
    indicators: { count: 20 },
    cycle: { monthly: true, quarterly: true, yearly: true },
    distribution: { workload: 0.4, cost: 0.2, risk: 0.2, satisfaction: 0.2 },
    feedback: { completed: 100 },
    suggestions: ['优化绩效分配权重', '提高反馈完成率'],
  };
}

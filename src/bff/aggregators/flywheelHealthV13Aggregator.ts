/**
 * 健澜科技 jlmedaios - 综合学习飞轮健康度仪表盘 V13 纯函数（M310-A）
 *
 * computeFlywheelHealthScoreV13 / gradeFlywheelHealthV13 / identifyHealthRiskV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健康度指标 */
export interface FlywheelHealthMetricsV13 {
  adoptionRate: number;
  closureRate: number;
  dualSedimentRate: number;
  milestoneRate: number;
}

/**
 * 健康分（纯函数）：采纳率×0.3 + 闭环率×0.25 + 双沉淀率×0.2 + 里程碑达成率×0.25，保留1位。
 *
 * @param metrics 指标
 * @returns 健康分
 */
export function computeFlywheelHealthScoreV13(metrics: FlywheelHealthMetricsV13): number {
  const raw =
    metrics.adoptionRate * 0.3 +
    metrics.closureRate * 0.25 +
    metrics.dualSedimentRate * 0.2 +
    metrics.milestoneRate * 0.25;
  return Math.round(raw * 10) / 10;
}

/**
 * 红黄绿灯（纯函数）：≥80 绿灯 / 60-80 黄灯 / <60 红灯。
 *
 * @param score 健康分
 * @returns 灯色
 */
export function gradeFlywheelHealthV13(score: number): string {
  if (score >= 80) return "绿灯";
  if (score >= 60) return "黄灯";
  return "红灯";
}

/**
 * 健康风险（纯函数）：红灯时列出最低维度。
 *
 * @param score 健康分
 * @param grade 灯色
 * @returns 风险描述
 */
export function identifyHealthRiskV13(score: number, grade: string): string {
  if (grade !== "红灯") return "无明显风险";
  return `健康分 ${score} < 60，需紧急介入`;
}

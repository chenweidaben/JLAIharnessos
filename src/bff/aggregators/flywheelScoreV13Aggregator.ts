/**
 * 健澜科技 jlmedaios - 医院 AI 学习飞轮成熟度 V13 纯函数（M306-A）
 *
 * computeFlywheelScoreV13 / gradeFlywheelV13 / identifyFlywheelBottleneckV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 飞轮指标 */
export interface FlywheelMetricsV13 {
  qualityScore: number;
  adoptionRate: number;
  feedbackLoopRate: number;
  pushCtr: number;
  crossDeptDiffusionRate: number;
  assetHealthScore: number;
}

const WEIGHTS = {
  qualityScore: 0.2,
  adoptionRate: 0.25,
  feedbackLoopRate: 0.15,
  pushCtr: 0.15,
  crossDeptDiffusionRate: 0.1,
  assetHealthScore: 0.15,
} as const;

/**
 * 飞轮总分（纯函数）：六项加权，保留1位。
 *
 * @param metrics 指标
 * @returns 总分
 */
export function computeFlywheelScoreV13(metrics: FlywheelMetricsV13): number {
  const raw =
    metrics.qualityScore * WEIGHTS.qualityScore +
    metrics.adoptionRate * WEIGHTS.adoptionRate +
    metrics.feedbackLoopRate * WEIGHTS.feedbackLoopRate +
    metrics.pushCtr * WEIGHTS.pushCtr +
    metrics.crossDeptDiffusionRate * WEIGHTS.crossDeptDiffusionRate +
    metrics.assetHealthScore * WEIGHTS.assetHealthScore;
  return Math.round(raw * 10) / 10;
}

/**
 * 等级（纯函数）：≥80 优秀 / 60-80 成长 / 40-60 起步 / <40 停滞。
 *
 * @param score 总分
 * @returns 等级
 */
export function gradeFlywheelV13(score: number): string {
  if (score >= 80) return "优秀";
  if (score >= 60) return "成长";
  if (score >= 40) return "起步";
  return "停滞";
}

/**
 * 瓶颈识别（纯函数）：六项里 weight×score 最低的那项。
 *
 * @param metrics 指标
 * @returns 瓶颈维度名
 */
export function identifyFlywheelBottleneckV13(metrics: FlywheelMetricsV13): string {
  const entries: [keyof FlywheelMetricsV13, number][] = [
    ["qualityScore", metrics.qualityScore * WEIGHTS.qualityScore],
    ["adoptionRate", metrics.adoptionRate * WEIGHTS.adoptionRate],
    ["feedbackLoopRate", metrics.feedbackLoopRate * WEIGHTS.feedbackLoopRate],
    ["pushCtr", metrics.pushCtr * WEIGHTS.pushCtr],
    ["crossDeptDiffusionRate", metrics.crossDeptDiffusionRate * WEIGHTS.crossDeptDiffusionRate],
    ["assetHealthScore", metrics.assetHealthScore * WEIGHTS.assetHealthScore],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

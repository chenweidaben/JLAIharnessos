/**
 * 健澜科技 jlmedaios - 质控评分自动计算 V14 聚合器（M492-B）
 *
 * 纯函数：质控得分自动计算 + 评分计算报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 扣分项 */
export interface DeductionV14 {
  rule: string;
  points: number;
}

/** 评分计算报告 */
export interface ScoreCalcReportV14 {
  totalDeduction: number;
  finalScore: number;
}

/**
 * 自动计算质控得分（100 - 扣分总和，clamp 0-100）。
 *
 * @param deductions 扣分项列表
 * @returns 质控得分
 */
export function calculateQcScore(deductions: DeductionV14[]): number {
  // 手算：score = 100 - sum(deductions.points)，clamp 到 [0, 100]
  const totalDeduction = deductions.reduce((acc, d) => acc + d.points, 0);
  const score = 100 - totalDeduction;
  return Math.max(0, Math.min(100, score));
}

/**
 * 构建评分计算报告（totalDeduction+finalScore）。
 *
 * @param deductions 扣分项列表
 * @returns 评分计算报告
 */
export function buildScoreCalcReport(deductions: DeductionV14[]): ScoreCalcReportV14 {
  // 手算：totalDeduction = sum(deductions.points)，finalScore = 100 - totalDeduction clamp 0-100
  const totalDeduction = deductions.reduce((acc, d) => acc + d.points, 0);
  const finalScore = Math.max(0, Math.min(100, 100 - totalDeduction));
  return { totalDeduction, finalScore };
}

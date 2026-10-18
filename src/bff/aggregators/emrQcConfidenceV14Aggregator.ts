/**
 * 健澜科技 jlmedaios - 质控知识置信度评估 V14 聚合器（M489-D，M489 收官）
 *
 * 纯函数：置信度评分构建 + 置信度聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 置信度评分 */
export interface ConfidenceScoreV14 {
  ruleName: string;
  score: number;
}

/**
 * 构建置信度评分。
 *
 * @param ruleName 规则名称
 * @param score 评分
 * @returns 置信度评分
 */
export function buildConfidenceScore(ruleName: string, score: number): ConfidenceScoreV14 {
  return { ruleName, score };
}

/**
 * 聚合置信度（总数+平均分+最高分）。
 *
 * @param scores 评分列表
 * @returns 聚合结果
 */
export function aggregateConfidence(scores: { ruleName: string; score: number }[]): { count: number; avgScore: number; maxScore: number } {
  const count = scores.length;
  if (count === 0) {
    return { count: 0, avgScore: 0, maxScore: 0 };
  }
  // 手算：avgScore = sum / count 保留 1 位小数
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  const avgScore = Math.round((sum / count) * 10) / 10;
  // 手算：maxScore = Math.max
  const maxScore = Math.max(...scores.map((s) => s.score));
  return { count, avgScore, maxScore };
}

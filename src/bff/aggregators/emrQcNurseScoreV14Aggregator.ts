/**
 * 健澜科技 jlmedaios - 质控护士评分 V14 聚合器（M494-B）
 *
 * 纯函数：护士评分构建 + 护士评分聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护士评分 */
export interface NurseScoreV14 {
  nurse: string;
  ward: string;
  score: number;
}

/** 护士评分聚合结果 */
export interface NurseScoreAggregateV14 {
  count: number;
  avgScore: number;
  maxScore: number;
}

/**
 * 构建护士评分。
 *
 * @param nurse 护士姓名
 * @param ward 病区
 * @param score 评分
 * @returns 护士评分
 */
export function buildNurseScore(nurse: string, ward: string, score: number): NurseScoreV14 {
  return { nurse, ward, score };
}

/**
 * 聚合护士评分（人数+平均分+最高分）。
 *
 * @param scores 护士评分列表
 * @returns 聚合结果
 */
export function aggregateNurseScores(scores: { nurse: string; score: number }[]): NurseScoreAggregateV14 {
  const count = scores.length;
  if (count === 0) {
    return { count: 0, avgScore: 0, maxScore: 0 };
  }
  // 手算：avgScore = sum / count 保留 1 位小数，maxScore = Math.max
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  const avgScore = Math.round((sum / count) * 10) / 10;
  const maxScore = Math.max(...scores.map((s) => s.score));
  return { count, avgScore, maxScore };
}

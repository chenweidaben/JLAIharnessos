/**
 * 健澜科技 jlmedaios - 质控科室主任评分 V14 聚合器（M494-C）
 *
 * 纯函数：科室主任评分构建 + 主任评分聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室主任评分 */
export interface DirectorScoreV14 {
  director: string;
  dept: string;
  score: number;
}

/** 主任评分聚合结果 */
export interface DirectorScoreAggregateV14 {
  count: number;
  avgScore: number;
  maxScore: number;
}

/**
 * 构建科室主任评分。
 *
 * @param director 主任姓名
 * @param dept 科室
 * @param score 评分
 * @returns 科室主任评分
 */
export function buildDirectorScore(director: string, dept: string, score: number): DirectorScoreV14 {
  return { director, dept, score };
}

/**
 * 聚合主任评分（人数+平均分+最高分）。
 *
 * @param scores 主任评分列表
 * @returns 聚合结果
 */
export function aggregateDirectorScores(scores: { director: string; score: number }[]): DirectorScoreAggregateV14 {
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

/**
 * 健澜科技 jlmedaios - 病历质控患者满意度 V14 聚合器（M475-C）
 *
 * 纯函数：满意度平均分计算 + 按科室分组统计。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 满意度答卷 */
export interface SatisfactionResponseV14 {
  score: number;
  dept: string;
}

/** 按科室平均分 */
export interface DeptAvgScoreV14 {
  dept: string;
  avg: number;
}

/** 满意度统计结果 */
export interface SatisfactionStatsV14 {
  totalResponses: number;
  avgScore: number;
  byDept: DeptAvgScoreV14[];
}

/**
 * 计算满意度平均分：avg=sum/count（保留 1 位小数）。
 *
 * @param responses 答卷列表
 * @returns 平均分（空数组返回 0）
 */
export function computeSatisfactionScore(responses: { score: number }[]): number {
  if (responses.length === 0) return 0;
  const sum = responses.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / responses.length) * 10) / 10;
}

/**
 * 统计满意度：总答卷数、平均分、按科室分组平均分。
 *
 * @param responses 答卷列表
 * @returns 满意度统计结果
 */
export function buildSatisfactionStats(responses: SatisfactionResponseV14[]): SatisfactionStatsV14 {
  const totalResponses = responses.length;
  const avgScore = computeSatisfactionScore(responses);

  const deptMap = new Map<string, number[]>();
  responses.forEach((r) => {
    const list = deptMap.get(r.dept) ?? [];
    list.push(r.score);
    deptMap.set(r.dept, list);
  });

  const byDept: DeptAvgScoreV14[] = Array.from(deptMap.entries()).map(([dept, scores]) => ({
    dept,
    avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
  }));

  return { totalResponses, avgScore, byDept };
}

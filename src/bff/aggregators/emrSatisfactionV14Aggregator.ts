/**
 * 健澜科技 jlmedaios - 病历质控满意度调查 V14 聚合器（M469-D，M469 收官）
 *
 * 纯函数：科室满意度聚合（平均分，1 位小数）+ 降序排名。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 满意度答卷 */
export interface SatisfactionResponseV14 {
  dept: string;
  score: number;
}

/** 聚合结果 */
export interface SatisfactionAggregatedV14 {
  dept: string;
  avgScore: number;
  count: number;
}

/** 排名结果 */
export interface SatisfactionRankedV14 {
  dept: string;
  avgScore: number;
  rank: number;
}

/**
 * 按 dept 聚合满意度平均分（保留 1 位小数）。
 *
 * @param responses 答卷列表
 * @returns 聚合结果
 */
export function computeSatisfactionScore(
  responses: SatisfactionResponseV14[],
): SatisfactionAggregatedV14[] {
  if (responses.length === 0) return [];
  const map = new Map<string, { sum: number; count: number }>();
  for (const r of responses) {
    const entry = map.get(r.dept) ?? { sum: 0, count: 0 };
    entry.sum += r.score;
    entry.count += 1;
    map.set(r.dept, entry);
  }
  return Array.from(map.entries()).map(([dept, v]) => ({
    dept,
    avgScore: Math.round((v.sum / v.count) * 10) / 10,
    count: v.count,
  }));
}

/**
 * 按 avgScore 降序排名。
 *
 * @param aggregated 聚合结果
 * @returns 排名结果
 */
export function rankBySatisfaction(
  aggregated: SatisfactionAggregatedV14[],
): SatisfactionRankedV14[] {
  return [...aggregated]
    .sort((a, b) => b.avgScore - a.avgScore)
    .map((item, idx) => ({
      dept: item.dept,
      avgScore: item.avgScore,
      rank: idx + 1,
    }));
}

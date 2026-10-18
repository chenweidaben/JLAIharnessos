/**
 * 健澜科技 jlmedaios - 病历科室质控对比分析 V14 聚合器（M469-B）
 *
 * 纯函数：科室得分对比 + 平均分偏差 + 对比表生成。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室得分输入 */
export interface DeptScoreInputV14 {
  name: string;
  score: number;
}

/** 科室对比结果 */
export interface DeptCompareResultV14 {
  name: string;
  score: number;
  rank: number;
  diffFromAvg: number;
}

/** 对比表 */
export interface ComparisonTableV14 {
  headers: string[];
  rows: string[][];
}

/**
 * 计算科室得分对比：平均分=sum/length，每个科室 diffFromAvg=score-avg，按 score 降序排名。
 *
 * @param depts 科室得分列表
 * @returns 对比结果（降序）
 */
export function compareDeptScores(depts: DeptScoreInputV14[]): DeptCompareResultV14[] {
  if (depts.length === 0) return [];
  const sum = depts.reduce((acc, d) => acc + d.score, 0);
  const avg = sum / depts.length;
  return depts
    .map((d) => ({
      name: d.name,
      score: d.score,
      rank: 0,
      diffFromAvg: Math.round((d.score - avg) * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

/**
 * 生成对比表（headers + rows）。
 *
 * @param depts 科室得分列表
 * @returns 对比表
 */
export function buildComparisonTable(depts: DeptScoreInputV14[]): ComparisonTableV14 {
  const results = compareDeptScores(depts);
  return {
    headers: ["科室名", "得分", "排名", "与平均分偏差"],
    rows: results.map((r) => [r.name, String(r.score), String(r.rank), String(r.diffFromAvg)]),
  };
}

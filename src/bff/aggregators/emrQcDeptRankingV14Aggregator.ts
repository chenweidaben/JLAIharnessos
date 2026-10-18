/**
 * 健澜科技 jlmedaios - 质控科室排名 V14 聚合器（M493-C）
 *
 * 纯函数：科室排名构建 + 科室按评分降序排名。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室排名 */
export interface DeptRankingV14 {
  dept: string;
  score: number;
  rank: number;
}

/** 科室评分输入 */
export interface DeptScoreV14 {
  dept: string;
  score: number;
}

/**
 * 构建科室排名。
 *
 * @param dept 科室名称
 * @param score 评分
 * @param rank 排名
 * @returns 科室排名
 */
export function buildDeptRanking(dept: string, score: number, rank: number): DeptRankingV14 {
  return { dept, score, rank };
}

/**
 * 科室按评分降序排名。
 *
 * @param depts 科室评分列表
 * @returns 排名结果（含 rank，从 1 开始）
 */
export function rankDepts(depts: DeptScoreV14[]): DeptRankingV14[] {
  // 手算：按 score 降序排列，rank 从 1 开始
  const sorted = [...depts].sort((a, b) => b.score - a.score);
  return sorted.map((d, index) => buildDeptRanking(d.dept, d.score, index + 1));
}

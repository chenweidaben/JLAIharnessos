/**
 * 健澜科技 jlmedaios - 质控科室考核评分 V14 聚合器（M501-D，M501 收官）
 *
 * 纯函数：科室考核评分构建 + 考核结果聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室考核评分 */
export interface DeptAssessScoreV14 {
  dept: string;
  score: number;
  rank: number;
}

/** 聚合结果 */
export interface DeptAssessAggregateV14 {
  avgScore: number;
  topDept: string;
}

/**
 * 构建科室考核评分。
 *
 * @param dept 科室名称
 * @param score 评分
 * @param rank 排名
 * @returns 科室考核评分
 */
export function buildDeptAssess(dept: string, score: number, rank: number): DeptAssessScoreV14 {
  return { dept, score, rank };
}

/**
 * 聚合考核结果（平均分 + 最高分科室）。
 *
 * @param assesses 考核评分数组
 * @returns 聚合结果
 */
export function aggregateDeptAssess(assesses: DeptAssessScoreV14[]): DeptAssessAggregateV14 {
  // 手算 avgScore：各科室评分之和 / 科室数，保留 1 位小数
  if (assesses.length === 0) {
    return { avgScore: 0, topDept: "" };
  }
  const sum = assesses.reduce((acc, a) => acc + a.score, 0);
  const avgScore = Math.round((sum / assesses.length) * 10) / 10;
  // 手算 topDept：最高分科室名
  let topDept = "";
  let topScore = -1;
  for (const assess of assesses) {
    if (assess.score > topScore) {
      topScore = assess.score;
      topDept = assess.dept;
    }
  }
  return { avgScore, topDept };
}

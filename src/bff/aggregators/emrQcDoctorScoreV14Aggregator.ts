/**
 * 健澜科技 jlmedaios - 质控医生评分 V14 聚合器（M494-A）
 *
 * 纯函数：医生评分构建 + 医生评分聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生评分 */
export interface DoctorScoreV14 {
  doctor: string;
  dept: string;
  score: number;
}

/** 医生评分聚合结果 */
export interface DoctorScoreAggregateV14 {
  count: number;
  avgScore: number;
  maxScore: number;
}

/**
 * 构建医生评分。
 *
 * @param doctor 医生姓名
 * @param dept 科室
 * @param score 评分
 * @returns 医生评分
 */
export function buildDoctorScore(doctor: string, dept: string, score: number): DoctorScoreV14 {
  return { doctor, dept, score };
}

/**
 * 聚合医生评分（人数+平均分+最高分）。
 *
 * @param scores 医生评分列表
 * @returns 聚合结果
 */
export function aggregateDoctorScores(scores: { doctor: string; score: number }[]): DoctorScoreAggregateV14 {
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

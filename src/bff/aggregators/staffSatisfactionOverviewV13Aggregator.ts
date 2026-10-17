/**
 * 健澜科技 jlmedaios - 员工满意度总览 V13 纯函数（M332-D）
 *
 * computeOverallStaffScoreV13 / rankDepartmentsByScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室满意度调研 */
export interface StaffSatisfactionSurveyV13 {
  department: string;
  score: number;
}

/** 科室排名项 */
export interface DepartmentRankV13 {
  department: string;
  score: number;
}

/**
 * 全院均分（纯函数）：1-5 分制，保留 1 位小数。
 *
 * @param surveys 科室调研列表
 * @returns 全院均分
 */
export function computeOverallStaffScoreV13(surveys: StaffSatisfactionSurveyV13[]): number {
  if (surveys.length === 0) return 0;
  const total = surveys.reduce((acc, s) => acc + s.score, 0);
  return Math.round((total / surveys.length) * 10) / 10;
}

/**
 * 各科室排名（纯函数）：按均分降序。
 *
 * @param surveys 科室调研列表
 * @returns 科室排名
 */
export function rankDepartmentsByScoreV13(surveys: StaffSatisfactionSurveyV13[]): DepartmentRankV13[] {
  return [...surveys]
    .map((s) => ({ department: s.department, score: s.score }))
    .sort((a, b) => b.score - a.score);
}

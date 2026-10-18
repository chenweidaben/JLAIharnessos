/**
 * 健澜科技 jlmedaios - 教学质量管理 V13 纯函数（M434-A，-quality 后缀避让旧版 trainingMgmtDetailV13（M419））
 *
 * computeTeachingPlanCompletionRateV13 / computeTeachingTeacherPassRateV13 / computeTeachingStudentSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 教学质量管理记录 */
export interface TeachingQualityMgmtRecordV13 {
  completedPlans: number;
  totalPlans: number;
  qualifiedTeachers: number;
  totalTeachers: number;
  satisfiedStudents: number;
  surveyedStudents: number;
}

/**
 * 教学计划完成率（纯函数）：已完成教学计划项数/教学计划项总数×100，保留 2 位小数。
 *
 * @param records 教学质量管理记录列表
 * @returns 教学计划完成率百分比
 */
export function computeTeachingPlanCompletionRateV13(records: TeachingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPlans, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedPlans, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 带教老师合格率（纯函数）：合格带教老师数/带教老师总数×100，保留 2 位小数。
 *
 * @param records 教学质量管理记录列表
 * @returns 带教老师合格率百分比
 */
export function computeTeachingTeacherPassRateV13(records: TeachingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTeachers, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedTeachers, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 学生满意度（纯函数）：满意学生数/调查学生总数×100，保留 2 位小数。
 *
 * @param records 教学质量管理记录列表
 * @returns 学生满意度百分比
 */
export function computeTeachingStudentSatisfactionRateV13(records: TeachingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedStudents, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedStudents, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

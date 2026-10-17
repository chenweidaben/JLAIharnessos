/**
 * 健澜科技 jlmedaios - 教学管理 V13 纯函数（M361-B）
 *
 * computeTeachingHoursCompletionRateV13 / computeTeacherQualificationPassRateV13 / computeStudentSatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 教学管理记录 */
export interface TeachingMgmtRecordV13 {
  completedHours: number;
  plannedHours: number;
  qualifiedTeachers: number;
  teacherCount: number;
  studentSatisfaction: number;
}

/**
 * 教学课时完成率（纯函数）：完成课时/计划课时×100，保留 2 位小数。
 *
 * @param records 教学管理记录列表
 * @returns 教学课时完成率百分比
 */
export function computeTeachingHoursCompletionRateV13(records: TeachingMgmtRecordV13[]): number {
  const completed = records.reduce((acc, r) => acc + r.completedHours, 0);
  const planned = records.reduce((acc, r) => acc + r.plannedHours, 0);
  if (planned === 0) return 0;
  return Math.round((completed / planned) * 10000) / 100;
}

/**
 * 带教老师资质合格率（纯函数）：合格数/带教老师数×100，保留 2 位小数。
 *
 * @param records 教学管理记录列表
 * @returns 带教老师资质合格率百分比
 */
export function computeTeacherQualificationPassRateV13(records: TeachingMgmtRecordV13[]): number {
  const qualified = records.reduce((acc, r) => acc + r.qualifiedTeachers, 0);
  const total = records.reduce((acc, r) => acc + r.teacherCount, 0);
  if (total === 0) return 0;
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 学员满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 教学管理记录列表
 * @returns 学员满意度均值
 */
export function computeStudentSatisfactionV13(records: TeachingMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.studentSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

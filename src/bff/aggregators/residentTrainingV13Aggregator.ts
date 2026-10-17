/**
 * 健澜科技 jlmedaios - 住院医师规范化培训 V13 纯函数（M343-A）
 *
 * computeResidentCountV13 / computeGraduationPassRateV13 / computeMentorCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住院医师规范化培训记录 */
export interface ResidentTrainingRecordV13 {
  residentCount: number;
  graduationTotal: number;
  graduationPassed: number;
  mentorCount: number;
}

/**
 * 在培人数（纯函数）：求和。
 *
 * @param records 住院医师规范化培训记录列表
 * @returns 在培人数
 */
export function computeResidentCountV13(records: ResidentTrainingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.residentCount, 0);
}

/**
 * 结业考核通过率（纯函数）：通过数/结业数×100，保留 1 位小数。
 *
 * @param records 住院医师规范化培训记录列表
 * @returns 结业考核通过率百分比
 */
export function computeGraduationPassRateV13(records: ResidentTrainingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.graduationTotal, 0);
  const passed = records.reduce((acc, r) => acc + r.graduationPassed, 0);
  if (total === 0) return 0;
  return Math.round((passed / total) * 1000) / 10;
}

/**
 * 带教老师数（纯函数）：求和。
 *
 * @param records 住院医师规范化培训记录列表
 * @returns 带教老师数
 */
export function computeMentorCountV13(records: ResidentTrainingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.mentorCount, 0);
}

/**
 * 健澜科技 jlmedaios - 住培管理统计 V13 纯函数（M383-C，stats 避让）
 *
 * computeResidentInTrainingCountV13 / computeGraduationExamPassRateV13 / computeResidentSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住培管理统计记录 */
export interface ResidentTrainingRecordV13 {
  residentCount: number;
  passCount: number;
  examCount: number;
  satisfactionCount: number;
  surveyCount: number;
}

/**
 * 在培住培医师数（纯函数）：求和。
 *
 * @param records 住培管理统计记录列表
 * @returns 在培住培医师数
 */
export function computeResidentInTrainingCountV13(records: ResidentTrainingRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.residentCount, 0);
}

/**
 * 结业考核通过率（纯函数）：通过数/参考数×100，保留 2 位小数。
 *
 * @param records 住培管理统计记录列表
 * @returns 结业考核通过率百分比
 */
export function computeGraduationExamPassRateV13(records: ResidentTrainingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.examCount, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.passCount, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 住培满意度（纯函数）：满意数/调查数×100，保留 2 位小数。
 *
 * @param records 住培管理统计记录列表
 * @returns 住培满意度百分比
 */
export function computeResidentSatisfactionRateV13(records: ResidentTrainingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyCount, 0);
  if (total === 0) return 0;
  const satisfaction = records.reduce((acc, r) => acc + r.satisfactionCount, 0);
  return Math.round((satisfaction / total) * 10000) / 100;
}

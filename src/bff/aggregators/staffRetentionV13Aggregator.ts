/**
 * 健澜科技 jlmedaios - 人员留存 V13 纯函数（M384-B）
 *
 * computeMedicalStaffTurnoverRateV13 / computeKeyStaffRetentionRateV13 / computeStaffSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 人员留存记录 */
export interface StaffRetentionRecordV13 {
  turnoverCount: number;
  totalStaff: number;
  retainedKeyStaff: number;
  keyStaff: number;
  satisfactionCount: number;
  surveyCount: number;
}

/**
 * 医护离职率（纯函数）：离职人数/在编人数×100，保留 2 位小数。
 *
 * @param records 人员留存记录列表
 * @returns 医护离职率百分比
 */
export function computeMedicalStaffTurnoverRateV13(records: StaffRetentionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalStaff, 0);
  if (total === 0) return 0;
  const turnover = records.reduce((acc, r) => acc + r.turnoverCount, 0);
  return Math.round((turnover / total) * 10000) / 100;
}

/**
 * 骨干留存率（纯函数）：留存骨干数/骨干总数×100，保留 2 位小数。
 *
 * @param records 人员留存记录列表
 * @returns 骨干留存率百分比
 */
export function computeKeyStaffRetentionRateV13(records: StaffRetentionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.keyStaff, 0);
  if (total === 0) return 0;
  const retained = records.reduce((acc, r) => acc + r.retainedKeyStaff, 0);
  return Math.round((retained / total) * 10000) / 100;
}

/**
 * 员工满意度（纯函数）：满意数/调查数×100，保留 2 位小数。
 *
 * @param records 人员留存记录列表
 * @returns 员工满意度百分比
 */
export function computeStaffSatisfactionRateV13(records: StaffRetentionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyCount, 0);
  if (total === 0) return 0;
  const satisfaction = records.reduce((acc, r) => acc + r.satisfactionCount, 0);
  return Math.round((satisfaction / total) * 10000) / 100;
}

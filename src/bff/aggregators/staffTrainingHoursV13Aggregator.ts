/**
 * 健澜科技 jlmedaios - 员工培训学时 V13 纯函数（M346-D，M346 收官）
 *
 * computeAvgAnnualHoursV13 / computeExamPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 员工培训学时记录 */
export interface StaffTrainingRecordV13 {
  annualHours: number;
  passedCount: number;
  examinedCount: number;
}

/**
 * 年度人均培训学时（纯函数）：均值，保留 1 位小数。
 *
 * @param records 员工培训学时记录列表
 * @returns 年度人均培训学时（小时）
 */
export function computeAvgAnnualHoursV13(records: StaffTrainingRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.annualHours, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 考核合格率（纯函数）：合格人数/参考人数×100，保留 2 位小数。
 *
 * @param records 员工培训学时记录列表
 * @returns 考核合格率百分比
 */
export function computeExamPassRateV13(records: StaffTrainingRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.passedCount, 0);
  const examined = records.reduce((acc, r) => acc + r.examinedCount, 0);
  if (examined === 0) return 0;
  return Math.round((passed / examined) * 10000) / 100;
}

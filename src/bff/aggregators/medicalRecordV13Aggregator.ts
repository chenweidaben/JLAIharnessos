/**
 * 健澜科技 jlmedaios - 病案管理 V13 纯函数（M401-A）
 *
 * computeMedicalRecordArchivingTimelyRateV13 / computeMedicalRecordGradeARateV13 / computeMedicalRecordFrontPagePassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病案管理记录 */
export interface MedicalRecordRecordV13 {
  timelyArchived: number;
  totalArchived: number;
  gradeA: number;
  totalRecords: number;
  passed: number;
  totalChecked: number;
}

/**
 * 病案归档及时率（纯函数）：及时归档数/应归档总数×100，保留 2 位小数。
 *
 * @param records 病案管理记录列表
 * @returns 病案归档及时率百分比
 */
export function computeMedicalRecordArchivingTimelyRateV13(records: MedicalRecordRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalArchived, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyArchived, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 病案甲级率（纯函数）：甲级病案数/病案总数×100，保留 2 位小数。
 *
 * @param records 病案管理记录列表
 * @returns 病案甲级率百分比
 */
export function computeMedicalRecordGradeARateV13(records: MedicalRecordRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  if (total === 0) return 0;
  const gradeA = records.reduce((acc, r) => acc + r.gradeA, 0);
  return Math.round((gradeA / total) * 10000) / 100;
}

/**
 * 病案首页合格率（纯函数）：合格数/检查总数×100，保留 2 位小数。
 *
 * @param records 病案管理记录列表
 * @returns 病案首页合格率百分比
 */
export function computeMedicalRecordFrontPagePassRateV13(records: MedicalRecordRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalChecked, 0);
  if (total === 0) return 0;
  const passed = records.reduce((acc, r) => acc + r.passed, 0);
  return Math.round((passed / total) * 10000) / 100;
}

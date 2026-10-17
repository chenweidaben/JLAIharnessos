/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 纯函数（M413-A）
 *
 * computeMedicalRecordGradeARateV13 / computeMedicalRecordRecallTimelyRateV13 / computeMedicalRecordCopyComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病案质量管理记录 */
export interface MedicalRecordMgmtRecordV13 {
  gradeA: number;
  total: number;
  timely: number;
  recallTotal: number;
  compliant: number;
  copyTotal: number;
}

/**
 * 病案甲级率（纯函数）：甲级病案数/病案总数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 病案甲级率百分比
 */
export function computeMedicalRecordGradeARateV13(records: MedicalRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const gradeA = records.reduce((acc, r) => acc + r.gradeA, 0);
  return Math.round((gradeA / total) * 10000) / 100;
}

/**
 * 病案召回及时率（纯函数）：及时召回数/召回总数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 病案召回及时率百分比
 */
export function computeMedicalRecordRecallTimelyRateV13(records: MedicalRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recallTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 病案复印合规率（纯函数）：合规复印数/复印总数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 病案复印合规率百分比
 */
export function computeMedicalRecordCopyComplianceRateV13(records: MedicalRecordMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.copyTotal, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

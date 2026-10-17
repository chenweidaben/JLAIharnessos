/**
 * 健澜科技 jlmedaios - 病案管理（细节）V13 纯函数（M419-A，detail 避让旧版 medicalRecordMgmtV13）
 *
 * computeMedicalRecordCoverPassRateV13 / computeMedicalRecordCodingAccuracyRateV13 / computeMedicalRecordCopyTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病案管理（细节）记录 */
export interface MedicalRecordDetailRecordV13 {
  coverQualified: number;
  coverTotal: number;
  codingAccurate: number;
  codingTotal: number;
  copyTimely: number;
  copyTotal: number;
}

/**
 * 病案首页合格率（纯函数）：合格首页数/病案首页总数×100，保留 2 位小数。
 *
 * @param records 病案管理（细节）记录列表
 * @returns 病案首页合格率百分比
 */
export function computeMedicalRecordCoverPassRateV13(records: MedicalRecordDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.coverTotal, 0);
  if (total === 0) return 0;
  const coverQualified = records.reduce((acc, r) => acc + r.coverQualified, 0);
  return Math.round((coverQualified / total) * 10000) / 100;
}

/**
 * 病案编码准确率（纯函数）：准确编码数/编码总数×100，保留 2 位小数。
 *
 * @param records 病案管理（细节）记录列表
 * @returns 病案编码准确率百分比
 */
export function computeMedicalRecordCodingAccuracyRateV13(records: MedicalRecordDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.codingTotal, 0);
  if (total === 0) return 0;
  const codingAccurate = records.reduce((acc, r) => acc + r.codingAccurate, 0);
  return Math.round((codingAccurate / total) * 10000) / 100;
}

/**
 * 病案复印及时率（纯函数）：及时复印数/复印总数×100，保留 2 位小数。
 *
 * @param records 病案管理（细节）记录列表
 * @returns 病案复印及时率百分比
 */
export function computeMedicalRecordCopyTimelyRateV13(records: MedicalRecordDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.copyTotal, 0);
  if (total === 0) return 0;
  const copyTimely = records.reduce((acc, r) => acc + r.copyTimely, 0);
  return Math.round((copyTimely / total) * 10000) / 100;
}

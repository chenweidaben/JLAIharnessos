/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 纯函数（M452-D，M452 收官，医院评审与临床质量改进组）
 *
 * computeMedicalRecordHomepageQualifiedRateV13 / computeMedicalRecordWritingGradeARateV13 / computeMedicalRecordRecoveryTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病案质量管理记录 */
export interface MedicalRecordQualityMgmtRecordV13 {
  qualified: number;
  totalHomepage: number;
  gradeA: number;
  totalMedicalRecord: number;
  timely: number;
  totalShouldRecover: number;
}

/**
 * 病案首页合格率（纯函数）：合格首页数/首页总数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 病案首页合格率百分比
 */
export function computeMedicalRecordHomepageQualifiedRateV13(records: MedicalRecordQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalHomepage, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 病历书写甲级率（纯函数）：甲级病历数/病历总数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 病历书写甲级率百分比
 */
export function computeMedicalRecordWritingGradeARateV13(records: MedicalRecordQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMedicalRecord, 0);
  if (total === 0) return 0;
  const gradeA = records.reduce((acc, r) => acc + r.gradeA, 0);
  return Math.round((gradeA / total) * 10000) / 100;
}

/**
 * 病案回收及时率（纯函数）：及时回收病案数/应回收病案总数×100，保留 2 位小数。
 *
 * @param records 病案质量管理记录列表
 * @returns 病案回收及时率百分比
 */
export function computeMedicalRecordRecoveryTimelyRateV13(records: MedicalRecordQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalShouldRecover, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

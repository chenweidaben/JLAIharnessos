/**
 * 健澜科技 jlmedaios - 知情同意统计 V13 纯函数（M387-C，stats 避让）
 *
 * computeInformedConsentSignRateV13 / computeSpecialExamConsentRateV13 / computeSurgeryConsentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知情同意统计记录 */
export interface InformedConsentRecordV13 {
  signedCount: number;
  shouldCount: number;
  specialSignedCount: number;
  specialShouldCount: number;
  surgerySignedCount: number;
  surgeryShouldCount: number;
}

/**
 * 知情同意书签署率（纯函数）：已签署数/应签署数×100，保留 2 位小数。
 *
 * @param records 知情同意统计记录列表
 * @returns 知情同意书签署率百分比
 */
export function computeInformedConsentSignRateV13(records: InformedConsentRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.signedCount, 0);
  return Math.round((signed / should) * 10000) / 100;
}

/**
 * 特殊检查同意率（纯函数）：已签署数/应签署数×100，保留 2 位小数。
 *
 * @param records 知情同意统计记录列表
 * @returns 特殊检查同意率百分比
 */
export function computeSpecialExamConsentRateV13(records: InformedConsentRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.specialShouldCount, 0);
  if (should === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.specialSignedCount, 0);
  return Math.round((signed / should) * 10000) / 100;
}

/**
 * 手术同意率（纯函数）：已签署数/应签署数×100，保留 2 位小数。
 *
 * @param records 知情同意统计记录列表
 * @returns 手术同意率百分比
 */
export function computeSurgeryConsentRateV13(records: InformedConsentRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.surgeryShouldCount, 0);
  if (should === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.surgerySignedCount, 0);
  return Math.round((signed / should) * 10000) / 100;
}

/**
 * 健澜科技 jlmedaios - 知情同意管理（细节）V13 纯函数（M413-B，detail 避让旧版 informedConsentStatsV13）
 *
 * computeInformedConsentSignRateV13 / computeInformedConsentContentCompletenessRateV13 / computeSpecialExaminationConsentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知情同意管理（细节）记录 */
export interface InformedConsentDetailRecordV13 {
  signed: number;
  shouldTotal: number;
  complete: number;
  consentTotal: number;
  specialAgreed: number;
  specialTotal: number;
}

/**
 * 知情同意书签署率（纯函数）：已签署数/应签署总数×100，保留 2 位小数。
 *
 * @param records 知情同意管理（细节）记录列表
 * @returns 知情同意书签署率百分比
 */
export function computeInformedConsentSignRateV13(records: InformedConsentDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTotal, 0);
  if (total === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.signed, 0);
  return Math.round((signed / total) * 10000) / 100;
}

/**
 * 知情同意内容完整率（纯函数）：内容完整份数/检查治疗同意书总数×100，保留 2 位小数。
 *
 * @param records 知情同意管理（细节）记录列表
 * @returns 知情同意内容完整率百分比
 */
export function computeInformedConsentContentCompletenessRateV13(records: InformedConsentDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.consentTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 特殊检查治疗同意率（纯函数）：特殊检查治疗已同意数/特殊检查治疗总数×100，保留 2 位小数。
 *
 * @param records 知情同意管理（细节）记录列表
 * @returns 特殊检查治疗同意率百分比
 */
export function computeSpecialExaminationConsentRateV13(records: InformedConsentDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specialTotal, 0);
  if (total === 0) return 0;
  const specialAgreed = records.reduce((acc, r) => acc + r.specialAgreed, 0);
  return Math.round((specialAgreed / total) * 10000) / 100;
}

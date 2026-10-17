/**
 * 健澜科技 jlmedaios - 知情同意管理 V13 纯函数（M425-C，换名避让旧版 consentDetailV13（M413））
 *
 * computeInformedConsentSignRateV13 / computeInformedConsentFormPassRateV13 / computeSpecialTreatmentConsentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知情同意管理记录 */
export interface ConsentMgmtRecordV13 {
  signed: number;
  shouldSign: number;
  formPass: number;
  signedTotal: number;
  specialSigned: number;
  specialCase: number;
}

/**
 * 知情同意签署率（纯函数）：签署知情同意数/应签署数×100，保留 2 位小数。
 *
 * @param records 知情同意管理记录列表
 * @returns 知情同意签署率百分比
 */
export function computeInformedConsentSignRateV13(records: ConsentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldSign, 0);
  if (total === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.signed, 0);
  return Math.round((signed / total) * 10000) / 100;
}

/**
 * 知情同意书合格率（纯函数）：合格知情同意书数/签署总数×100，保留 2 位小数。
 *
 * @param records 知情同意管理记录列表
 * @returns 知情同意书合格率百分比
 */
export function computeInformedConsentFormPassRateV13(records: ConsentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.signedTotal, 0);
  if (total === 0) return 0;
  const formPass = records.reduce((acc, r) => acc + r.formPass, 0);
  return Math.round((formPass / total) * 10000) / 100;
}

/**
 * 特殊治疗同意率（纯函数）：签署特殊治疗同意数/特殊治疗例数×100，保留 2 位小数。
 *
 * @param records 知情同意管理记录列表
 * @returns 特殊治疗同意率百分比
 */
export function computeSpecialTreatmentConsentRateV13(records: ConsentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specialCase, 0);
  if (total === 0) return 0;
  const specialSigned = records.reduce((acc, r) => acc + r.specialSigned, 0);
  return Math.round((specialSigned / total) * 10000) / 100;
}

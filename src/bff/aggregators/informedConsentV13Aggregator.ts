/**
 * 健澜科技 jlmedaios - 知情同意书签署率 V13 纯函数（M340-C）
 *
 * computeSurgeryConsentRateV13 / computeSpecialExamConsentRateV13 / computeSpecialTreatmentConsentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知情同意书签署率记录 */
export interface InformedConsentRecordV13 {
  surgeryRequired: number;
  surgerySigned: number;
  specialExamRequired: number;
  specialExamSigned: number;
  specialTreatmentRequired: number;
  specialTreatmentSigned: number;
}

/**
 * 手术知情同意签署率（纯函数）：已签数/应签数×100，保留 1 位小数。
 *
 * @param records 知情同意书签署率记录列表
 * @returns 签署率百分比
 */
export function computeSurgeryConsentRateV13(records: InformedConsentRecordV13[]): number {
  const required = records.reduce((acc, r) => acc + r.surgeryRequired, 0);
  const signed = records.reduce((acc, r) => acc + r.surgerySigned, 0);
  if (required === 0) return 0;
  return Math.round((signed / required) * 1000) / 10;
}

/**
 * 特殊检查签署率（纯函数）：已签数/应签数×100，保留 1 位小数。
 *
 * @param records 知情同意书签署率记录列表
 * @returns 签署率百分比
 */
export function computeSpecialExamConsentRateV13(records: InformedConsentRecordV13[]): number {
  const required = records.reduce((acc, r) => acc + r.specialExamRequired, 0);
  const signed = records.reduce((acc, r) => acc + r.specialExamSigned, 0);
  if (required === 0) return 0;
  return Math.round((signed / required) * 1000) / 10;
}

/**
 * 特殊治疗签署率（纯函数）：已签数/应签数×100，保留 1 位小数。
 *
 * @param records 知情同意书签署率记录列表
 * @returns 签署率百分比
 */
export function computeSpecialTreatmentConsentRateV13(records: InformedConsentRecordV13[]): number {
  const required = records.reduce((acc, r) => acc + r.specialTreatmentRequired, 0);
  const signed = records.reduce((acc, r) => acc + r.specialTreatmentSigned, 0);
  if (required === 0) return 0;
  return Math.round((signed / required) * 1000) / 10;
}

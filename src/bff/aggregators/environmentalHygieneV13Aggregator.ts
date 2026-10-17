/**
 * 健澜科技 jlmedaios - 环境卫生学 V13 纯函数（M370-C）
 *
 * computeEnvironmentSamplingPassRateV13 / computeMedicalWasteDisposalComplianceRateV13 / computeSewageDischargeComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 环境卫生学记录 */
export interface EnvironmentalHygieneRecordV13 {
  sampleCount: number;
  samplePass: number;
  wasteDisposalCount: number;
  wasteDisposalCompliant: number;
  sewageTestCount: number;
  sewageDischargeCompliant: number;
}

/**
 * 环境采样合格率（纯函数）：合格数/采样数×100，保留 2 位小数。
 *
 * @param records 环境卫生学记录列表
 * @returns 环境采样合格率百分比
 */
export function computeEnvironmentSamplingPassRateV13(records: EnvironmentalHygieneRecordV13[]): number {
  const sample = records.reduce((acc, r) => acc + r.sampleCount, 0);
  if (sample === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.samplePass, 0);
  return Math.round((pass / sample) * 10000) / 100;
}

/**
 * 医疗废物处置合规率（纯函数）：合规次数/处置次数×100，保留 2 位小数。
 *
 * @param records 环境卫生学记录列表
 * @returns 医疗废物处置合规率百分比
 */
export function computeMedicalWasteDisposalComplianceRateV13(records: EnvironmentalHygieneRecordV13[]): number {
  const disposal = records.reduce((acc, r) => acc + r.wasteDisposalCount, 0);
  if (disposal === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.wasteDisposalCompliant, 0);
  return Math.round((compliant / disposal) * 10000) / 100;
}

/**
 * 污水排放达标率（纯函数）：达标次数/检测次数×100，保留 2 位小数。
 *
 * @param records 环境卫生学记录列表
 * @returns 污水排放达标率百分比
 */
export function computeSewageDischargeComplianceRateV13(records: EnvironmentalHygieneRecordV13[]): number {
  const test = records.reduce((acc, r) => acc + r.sewageTestCount, 0);
  if (test === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.sewageDischargeCompliant, 0);
  return Math.round((compliant / test) * 10000) / 100;
}

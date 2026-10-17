/**
 * 健澜科技 jlmedaios - 医废追溯管理 V13 纯函数（M423-D，M423 收官，换名避让旧版 infectionControlDetailV13（M418））
 *
 * computeMedicalWasteTraceabilityCompleteRateV13 / computeMedicalWasteManifestComplianceRateV13 / computeMedicalWasteDisposalTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医废追溯管理记录 */
export interface MedicalWasteTrackingRecordV13 {
  traceComplete: number;
  wasteTotal: number;
  manifestCompliant: number;
  manifestTotal: number;
  timelyDisposal: number;
}

/**
 * 医废溯源完整率（纯函数）：完整溯源医废数/医废总数×100，保留 2 位小数。
 *
 * @param records 医废追溯管理记录列表
 * @returns 医废溯源完整率百分比
 */
export function computeMedicalWasteTraceabilityCompleteRateV13(records: MedicalWasteTrackingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.wasteTotal, 0);
  if (total === 0) return 0;
  const trace = records.reduce((acc, r) => acc + r.traceComplete, 0);
  return Math.round((trace / total) * 10000) / 100;
}

/**
 * 医废联单合规率（纯函数）：合规联单数/联单总数×100，保留 2 位小数。
 *
 * @param records 医废追溯管理记录列表
 * @returns 医废联单合规率百分比
 */
export function computeMedicalWasteManifestComplianceRateV13(records: MedicalWasteTrackingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.manifestTotal, 0);
  if (total === 0) return 0;
  const manifest = records.reduce((acc, r) => acc + r.manifestCompliant, 0);
  return Math.round((manifest / total) * 10000) / 100;
}

/**
 * 医废处置及时率（纯函数）：及时处置医废数/医废总数×100，保留 2 位小数。
 *
 * @param records 医废追溯管理记录列表
 * @returns 医废处置及时率百分比
 */
export function computeMedicalWasteDisposalTimelyRateV13(records: MedicalWasteTrackingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.wasteTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyDisposal, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 健澜科技 jlmedaios - 医废追溯质量管理 V13 纯函数（M436-D，M436 收官，-quality 后缀避让旧版 medicalWasteTraceabilityMgmtV13（M423））
 *
 * computeMedicalWasteClassificationAccuracyRateV13 / computeMedicalWasteHandoverCompletenessRateV13 / computeMedicalWasteDisposalTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医废追溯质量管理记录 */
export interface MedicalWasteTraceabilityQualityMgmtRecordV13 {
  accurateClassified: number;
  totalWaste: number;
  completeHandover: number;
  totalHandover: number;
  timelyDisposal: number;
  shouldDisposal: number;
}

/**
 * 医废分类准确率（纯函数）：准确分类医废数/医废总数×100，保留 2 位小数。
 *
 * @param records 医废追溯质量管理记录列表
 * @returns 医废分类准确率百分比
 */
export function computeMedicalWasteClassificationAccuracyRateV13(records: MedicalWasteTraceabilityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalWaste, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurateClassified, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 医废交接完整率（纯函数）：完整交接次数/交接总次数×100，保留 2 位小数。
 *
 * @param records 医废追溯质量管理记录列表
 * @returns 医废交接完整率百分比
 */
export function computeMedicalWasteHandoverCompletenessRateV13(records: MedicalWasteTraceabilityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalHandover, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.completeHandover, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 医废处置及时率（纯函数）：及时处置次数/应处置次数×100，保留 2 位小数。
 *
 * @param records 医废追溯质量管理记录列表
 * @returns 医废处置及时率百分比
 */
export function computeMedicalWasteDisposalTimelinessRateV13(records: MedicalWasteTraceabilityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldDisposal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyDisposal, 0);
  return Math.round((timely / total) * 10000) / 100;
}

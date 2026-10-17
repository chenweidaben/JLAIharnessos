/**
 * 健澜科技 jlmedaios - DIP 病种分值 V13 纯函数（M356-B）
 *
 * computeDipCoverageRateV13 / computeDiseaseStructureIndexV13 / computeInsuranceSurplusAmountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DIP 病种分值记录 */
export interface DipScoreRecordV13 {
  dipEnrolledDiseases: number;
  totalDiseases: number;
  diseaseStructureIndex: number;
  insuranceSurplusAmount: number;
}

/**
 * DIP 覆盖率（纯函数）：入组病种数/总病种数×100，保留 2 位小数。
 *
 * @param records DIP 病种分值记录列表
 * @returns DIP 覆盖率百分比
 */
export function computeDipCoverageRateV13(records: DipScoreRecordV13[]): number {
  const enrolled = records.reduce((acc, r) => acc + r.dipEnrolledDiseases, 0);
  const total = records.reduce((acc, r) => acc + r.totalDiseases, 0);
  if (total === 0) return 0;
  return Math.round((enrolled / total) * 10000) / 100;
}

/**
 * 病种结构指数（纯函数）：均值，保留 3 位小数。
 *
 * @param records DIP 病种分值记录列表
 * @returns 病种结构指数
 */
export function computeDiseaseStructureIndexV13(records: DipScoreRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.diseaseStructureIndex, 0);
  return Math.round((sum / records.length) * 1000) / 1000;
}

/**
 * 医保结余留用金额（纯函数）：求和，单位万元，保留 2 位小数。
 *
 * @param records DIP 病种分值记录列表
 * @returns 医保结余留用金额（万元）
 */
export function computeInsuranceSurplusAmountV13(records: DipScoreRecordV13[]): number {
  const sum = records.reduce((acc, r) => acc + r.insuranceSurplusAmount, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * 健澜科技 jlmedaios - 31 天再入院率 V13 纯函数（M335-D）
 *
 * computeOverallReadmissionRateV13 / computeDiseaseReadmissionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 再入院记录 */
export interface ReadmissionRecordV13 {
  disease: string;
  dischargedCount: number;
  readmittedCount: number;
}

/** 病种再入院率项 */
export interface DiseaseReadmissionRateItemV13 {
  disease: string;
  rate: number;
}

/**
 * 总体 31 天再入院率（纯函数）：再入院数/出院总数×100。
 *
 * @param records 再入院记录列表
 * @returns 总体再入院率百分比
 */
export function computeOverallReadmissionRateV13(records: ReadmissionRecordV13[]): number {
  const totalDischarged = records.reduce((acc, r) => acc + r.dischargedCount, 0);
  const totalReadmitted = records.reduce((acc, r) => acc + r.readmittedCount, 0);
  if (totalDischarged === 0) return 0;
  return Math.round((totalReadmitted / totalDischarged) * 100);
}

/**
 * 各病种再入院率（纯函数）：按病种分组求率，保留 1 位小数。
 *
 * @param records 再入院记录列表
 * @returns 各病种再入院率
 */
export function computeDiseaseReadmissionRateV13(records: ReadmissionRecordV13[]): DiseaseReadmissionRateItemV13[] {
  return records.map((r) => ({
    disease: r.disease,
    rate: r.dischargedCount === 0 ? 0 : Math.round((r.readmittedCount / r.dischargedCount) * 1000) / 10,
  }));
}

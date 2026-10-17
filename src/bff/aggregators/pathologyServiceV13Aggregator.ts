/**
 * 健澜科技 jlmedaios - 病理服务 V13 纯函数（M374-C）
 *
 * computePathologyBiopsyCountV13 / computePathologyFrozenSectionCountV13 / computePathologyDiagnosisConsistencyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病理服务记录 */
export interface PathologyServiceRecordV13 {
  biopsyCount: number;
  frozenSectionCount: number;
  diagnosisSample: number;
  diagnosisPass: number;
}

/**
 * 病理活检人次（纯函数）：求和。
 *
 * @param records 病理服务记录列表
 * @returns 病理活检人次
 */
export function computePathologyBiopsyCountV13(records: PathologyServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.biopsyCount, 0);
}

/**
 * 病理冰冻人次（纯函数）：求和。
 *
 * @param records 病理服务记录列表
 * @returns 病理冰冻人次
 */
export function computePathologyFrozenSectionCountV13(records: PathologyServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.frozenSectionCount, 0);
}

/**
 * 病理诊断符合率（纯函数）：符合数/抽样数×100，保留 2 位小数。
 *
 * @param records 病理服务记录列表
 * @returns 病理诊断符合率百分比
 */
export function computePathologyDiagnosisConsistencyRateV13(records: PathologyServiceRecordV13[]): number {
  const sample = records.reduce((acc, r) => acc + r.diagnosisSample, 0);
  if (sample === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.diagnosisPass, 0);
  return Math.round((pass / sample) * 10000) / 100;
}

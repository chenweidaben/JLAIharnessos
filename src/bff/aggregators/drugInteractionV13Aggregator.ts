/**
 * 健澜科技 jlmedaios - 药物相互作用 V13 纯函数（M368-B）
 *
 * computeDrugInteractionWarningCountV13 / computeWarningInterceptRateV13 / computeMedicationErrorCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药物相互作用记录 */
export interface DrugInteractionRecordV13 {
  interactionWarningCount: number;
  warningIntercepted: number;
  medicationErrorCount: number;
}

/**
 * 相互作用预警数（纯函数）：求和。
 *
 * @param records 药物相互作用记录列表
 * @returns 相互作用预警数
 */
export function computeDrugInteractionWarningCountV13(records: DrugInteractionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.interactionWarningCount, 0);
}

/**
 * 预警拦截率（纯函数）：拦截数/预警数×100，保留 2 位小数。
 *
 * @param records 药物相互作用记录列表
 * @returns 预警拦截率百分比
 */
export function computeWarningInterceptRateV13(records: DrugInteractionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.interactionWarningCount, 0);
  if (total === 0) return 0;
  const intercepted = records.reduce((acc, r) => acc + r.warningIntercepted, 0);
  return Math.round((intercepted / total) * 10000) / 100;
}

/**
 * 用药错误数（纯函数）：求和。
 *
 * @param records 药物相互作用记录列表
 * @returns 用药错误数
 */
export function computeMedicationErrorCountV13(records: DrugInteractionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.medicationErrorCount, 0);
}

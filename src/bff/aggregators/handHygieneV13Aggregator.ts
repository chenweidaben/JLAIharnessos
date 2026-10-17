/**
 * 健澜科技 jlmedaios - 手卫生依从率 V13 纯函数（M341-A）
 *
 * computeObservationCountV13 / computeCompliantCountV13 / computeComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手卫生依从率记录 */
export interface HandHygieneRecordV13 {
  observationCount: number;
  compliantCount: number;
}

/**
 * 观察次数（纯函数）：求和。
 *
 * @param records 手卫生依从率记录列表
 * @returns 观察次数
 */
export function computeObservationCountV13(records: HandHygieneRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.observationCount, 0);
}

/**
 * 合格次数（纯函数）：求和。
 *
 * @param records 手卫生依从率记录列表
 * @returns 合格次数
 */
export function computeCompliantCountV13(records: HandHygieneRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.compliantCount, 0);
}

/**
 * 依从率（纯函数）：合格数/观察数×100，保留 1 位小数。
 *
 * @param records 手卫生依从率记录列表
 * @returns 依从率百分比
 */
export function computeComplianceRateV13(records: HandHygieneRecordV13[]): number {
  const observed = computeObservationCountV13(records);
  const compliant = computeCompliantCountV13(records);
  if (observed === 0) return 0;
  return Math.round((compliant / observed) * 1000) / 10;
}

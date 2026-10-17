/**
 * 健澜科技 jlmedaios - 检验差错率 V13 纯函数（M338-C）
 *
 * computeQCFailureCountV13 / computeEQAFailureRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检验差错率记录 */
export interface LabErrorRecordV13 {
  qcFailureCount: number;
  eqaTotalItems: number;
  eqaFailedItems: number;
}

/**
 * 室内质控失控次数（纯函数）：求和。
 *
 * @param records 检验差错率记录列表
 * @returns 质控失控次数
 */
export function computeQCFailureCountV13(records: LabErrorRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.qcFailureCount, 0);
}

/**
 * 室间质评不合格率（纯函数）：不合格数/总室间质评数×100。
 *
 * @param records 检验差错率记录列表
 * @returns 室间质评不合格率百分比
 */
export function computeEQAFailureRateV13(records: LabErrorRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.eqaTotalItems, 0);
  const failed = records.reduce((acc, r) => acc + r.eqaFailedItems, 0);
  if (total === 0) return 0;
  return Math.round((failed / total) * 100);
}

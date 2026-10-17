/**
 * 健澜科技 jlmedaios - 隔离医嘱执行率 V13 纯函数（M341-C）
 *
 * computeIsolationExecutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 隔离医嘱执行率记录 */
export interface IsolationOrderRecordV13 {
  requiredCount: number;
  executedCount: number;
}

/**
 * 隔离医嘱执行率（纯函数）：已执行数/应执行数×100，保留 1 位小数。
 *
 * @param records 隔离医嘱执行率记录列表
 * @returns 执行率百分比
 */
export function computeIsolationExecutionRateV13(records: IsolationOrderRecordV13[]): number {
  const required = records.reduce((acc, r) => acc + r.requiredCount, 0);
  const executed = records.reduce((acc, r) => acc + r.executedCount, 0);
  if (required === 0) return 0;
  return Math.round((executed / required) * 1000) / 10;
}

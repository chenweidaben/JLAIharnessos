/**
 * 健澜科技 jlmedaios - 手术部位感染率 V13 纯函数（M339-C）
 *
 * computeSSIRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术部位感染率记录 */
export interface SSIRecordV13 {
  totalSurgeries: number;
  ssiCount: number;
}

/**
 * SSI 发生率（纯函数）：感染台次/手术总台次×100，保留 1 位小数。
 *
 * @param records 手术部位感染率记录列表
 * @returns SSI 发生率百分比
 */
export function computeSSIRateV13(records: SSIRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurgeries, 0);
  const ssi = records.reduce((acc, r) => acc + r.ssiCount, 0);
  if (total === 0) return 0;
  return Math.round((ssi / total) * 1000) / 10;
}

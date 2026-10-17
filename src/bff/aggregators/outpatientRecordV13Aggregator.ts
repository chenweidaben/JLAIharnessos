/**
 * 健澜科技 jlmedaios - 门诊病历书写合格率 V13 纯函数（M340-D）
 *
 * computeOutpatientRecordPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊病历书写合格率记录 */
export interface OutpatientRecordV13 {
  totalChecked: number;
  passCount: number;
}

/**
 * 门诊病历书写合格率（纯函数）：合格数/抽查总数×100，保留 1 位小数。
 *
 * @param records 门诊病历书写合格率记录列表
 * @returns 合格率百分比
 */
export function computeOutpatientRecordPassRateV13(records: OutpatientRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalChecked, 0);
  const pass = records.reduce((acc, r) => acc + r.passCount, 0);
  if (total === 0) return 0;
  return Math.round((pass / total) * 1000) / 10;
}

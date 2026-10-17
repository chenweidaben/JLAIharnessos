/**
 * 健澜科技 jlmedaios - 环境消毒合格率 V13 纯函数（M341-D）
 *
 * computeDisinfectionPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 环境消毒合格率记录 */
export interface EnvDisinfectionRecordV13 {
  totalSampled: number;
  passCount: number;
}

/**
 * 环境消毒合格率（纯函数）：合格数/采样总数×100，保留 1 位小数。
 *
 * @param records 环境消毒合格率记录列表
 * @returns 合格率百分比
 */
export function computeDisinfectionPassRateV13(records: EnvDisinfectionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSampled, 0);
  const pass = records.reduce((acc, r) => acc + r.passCount, 0);
  if (total === 0) return 0;
  return Math.round((pass / total) * 1000) / 10;
}

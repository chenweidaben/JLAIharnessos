/**
 * 健澜科技 jlmedaios - 麻醉质量 V13 纯函数（M391-B）
 *
 * computeAnesthesiaStartTimeAvgV13 / computeAnesthesiaRecoveryTimeAvgV13 / computeAnesthesiaAdverseEventRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 麻醉质量记录 */
export interface AnesthesiaDetailRecordV13 {
  totalStartMinutes: number;
  totalRecoveryMinutes: number;
  anesthesiaCount: number;
  recoveryCount: number;
  adverseEventCount: number;
}

/**
 * 麻醉开始时长（纯函数）：总麻醉开始时长/麻醉总数，保留 2 位小数，分钟。
 *
 * @param records 麻醉质量记录列表
 * @returns 平均麻醉开始时长（分钟）
 */
export function computeAnesthesiaStartTimeAvgV13(records: AnesthesiaDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.anesthesiaCount, 0);
  if (total === 0) return 0;
  const minutes = records.reduce((acc, r) => acc + r.totalStartMinutes, 0);
  return Math.round((minutes / total) * 100) / 100;
}

/**
 * 麻醉苏醒时长（纯函数）：总苏醒时长/苏醒总数，保留 2 位小数，分钟。
 *
 * @param records 麻醉质量记录列表
 * @returns 平均麻醉苏醒时长（分钟）
 */
export function computeAnesthesiaRecoveryTimeAvgV13(records: AnesthesiaDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recoveryCount, 0);
  if (total === 0) return 0;
  const minutes = records.reduce((acc, r) => acc + r.totalRecoveryMinutes, 0);
  return Math.round((minutes / total) * 100) / 100;
}

/**
 * 麻醉不良事件率（纯函数）：不良事件数/麻醉总数×100，保留 2 位小数。
 *
 * @param records 麻醉质量记录列表
 * @returns 麻醉不良事件率百分比
 */
export function computeAnesthesiaAdverseEventRateV13(records: AnesthesiaDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.anesthesiaCount, 0);
  if (total === 0) return 0;
  const adverse = records.reduce((acc, r) => acc + r.adverseEventCount, 0);
  return Math.round((adverse / total) * 10000) / 100;
}

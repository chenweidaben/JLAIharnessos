/**
 * 健澜科技 jlmedaios - 用血合理率 V13 纯函数（M333-D）
 *
 * computeReasonableBloodUseRateV13 / computeAutologousTransfusionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 用血记录 */
export interface BloodUseRecordV13 {
  totalUseCount: number;
  reasonableUseCount: number;
  totalTransfusionCount: number;
  autologousTransfusionCount: number;
}

/**
 * 合理用血率（纯函数）：合理用血数/总用血数×100。
 *
 * @param records 用血记录列表
 * @returns 合理用血率百分比
 */
export function computeReasonableBloodUseRateV13(records: BloodUseRecordV13[]): number {
  const totalUse = records.reduce((acc, r) => acc + r.totalUseCount, 0);
  const reasonableUse = records.reduce((acc, r) => acc + r.reasonableUseCount, 0);
  if (totalUse === 0) return 0;
  return Math.round((reasonableUse / totalUse) * 100);
}

/**
 * 自体输血率（纯函数）：自体输血数/总输血数×100。
 *
 * @param records 用血记录列表
 * @returns 自体输血率百分比
 */
export function computeAutologousTransfusionRateV13(records: BloodUseRecordV13[]): number {
  const totalTransfusion = records.reduce((acc, r) => acc + r.totalTransfusionCount, 0);
  const autologous = records.reduce((acc, r) => acc + r.autologousTransfusionCount, 0);
  if (totalTransfusion === 0) return 0;
  return Math.round((autologous / totalTransfusion) * 100);
}

/**
 * 健澜科技 jlmedaios - 输血管理 V13 纯函数（M360-D，M360 收官）
 *
 * computeBloodTransfusionReactionRateV13 / computeAutologousTransfusionRateV13 / computeBloodRequestRationalRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输血管理记录 */
export interface BloodMgmtRecordV13 {
  reactionCount: number;
  transfusionCount: number;
  autologousTransfusion: number;
  transfusionTotal: number;
  requestRational: number;
  requestCount: number;
}

/**
 * 输血不良反应发生率（纯函数）：反应数/输血人次×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 输血不良反应发生率百分比
 */
export function computeBloodTransfusionReactionRateV13(records: BloodMgmtRecordV13[]): number {
  const reaction = records.reduce((acc, r) => acc + r.reactionCount, 0);
  const total = records.reduce((acc, r) => acc + r.transfusionCount, 0);
  if (total === 0) return 0;
  return Math.round((reaction / total) * 10000) / 100;
}

/**
 * 自体输血率（纯函数）：自体输血人次/输血人次×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 自体输血率百分比
 */
export function computeAutologousTransfusionRateV13(records: BloodMgmtRecordV13[]): number {
  const autologous = records.reduce((acc, r) => acc + r.autologousTransfusion, 0);
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  return Math.round((autologous / total) * 10000) / 100;
}

/**
 * 用血申请合理率（纯函数）：合理申请数/申请数×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 用血申请合理率百分比
 */
export function computeBloodRequestRationalRateV13(records: BloodMgmtRecordV13[]): number {
  const rational = records.reduce((acc, r) => acc + r.requestRational, 0);
  const total = records.reduce((acc, r) => acc + r.requestCount, 0);
  if (total === 0) return 0;
  return Math.round((rational / total) * 10000) / 100;
}

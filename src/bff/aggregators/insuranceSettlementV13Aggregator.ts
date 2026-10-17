/**
 * 健澜科技 jlmedaios - 医保结算 V13 纯函数（M329-D）
 *
 * sumSettlementAmountV13 / sumRejectedAmountV13 / computeRejectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 结算记录 */
export interface SettlementRecordV13 {
  settlementAmount: number;
  rejectedAmount: number;
}

/**
 * 本月结算金额（纯函数）：求和。
 *
 * @param records 结算记录列表
 * @returns 结算总金额（万元）
 */
export function sumSettlementAmountV13(records: SettlementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.settlementAmount, 0);
}

/**
 * 拒付金额（纯函数）：求和。
 *
 * @param records 结算记录列表
 * @returns 拒付总金额（万元）
 */
export function sumRejectedAmountV13(records: SettlementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.rejectedAmount, 0);
}

/**
 * 拒付率（纯函数）：拒付/结算×100。
 *
 * @param settlement 结算金额（万元）
 * @param rejected 拒付金额（万元）
 * @returns 拒付率百分比
 */
export function computeRejectionRateV13(settlement: number, rejected: number): number {
  if (settlement === 0) return 0;
  return Math.round((rejected / settlement) * 100);
}

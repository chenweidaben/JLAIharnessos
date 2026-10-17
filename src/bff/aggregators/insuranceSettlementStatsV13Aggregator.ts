/**
 * 健澜科技 jlmedaios - 医保结算 V13 纯函数（M345-A，stats 避让 M329-D）
 *
 * computeMonthlySettlementAmountV13 / computeRejectionAmountV13 / computeRejectionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医保结算记录 */
export interface InsuranceSettlementRecordV13 {
  settlementAmount: number;
  rejectedAmount: number;
}

/**
 * 月度结算金额（纯函数）：求和（万元）。
 *
 * @param records 医保结算记录列表
 * @returns 月度结算金额（万元）
 */
export function computeMonthlySettlementAmountV13(records: InsuranceSettlementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.settlementAmount, 0);
}

/**
 * 拒付金额（纯函数）：求和（万元）。
 *
 * @param records 医保结算记录列表
 * @returns 拒付金额（万元）
 */
export function computeRejectionAmountV13(records: InsuranceSettlementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.rejectedAmount, 0);
}

/**
 * 拒付率（纯函数）：拒付/结算×100，保留 2 位小数。
 *
 * @param records 医保结算记录列表
 * @returns 拒付率百分比
 */
export function computeRejectionRateV13(records: InsuranceSettlementRecordV13[]): number {
  const settlement = computeMonthlySettlementAmountV13(records);
  const rejected = computeRejectionAmountV13(records);
  if (settlement === 0) return 0;
  return Math.round((rejected / settlement) * 10000) / 100;
}

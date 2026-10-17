/**
 * 健澜科技 jlmedaios - 医保结算明细 V13 纯函数（M375-A，避让 detail 后缀）
 *
 * computeInsuranceSettlementCountV13 / computeInsuranceFundExpenseV13 / computePersonalOutOfPocketRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医保结算明细记录 */
export interface InsuranceSettlementRecordV13 {
  settlementCount: number;
  fundExpense: number;
  totalCost: number;
  personalOutOfPocket: number;
}

/**
 * 医保结算人次（纯函数）：求和。
 *
 * @param records 医保结算明细记录列表
 * @returns 医保结算人次
 */
export function computeInsuranceSettlementCountV13(records: InsuranceSettlementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.settlementCount, 0);
}

/**
 * 医保基金支出（纯函数）：求和，单位元，保留 2 位小数。
 *
 * @param records 医保结算明细记录列表
 * @returns 医保基金支出（元）
 */
export function computeInsuranceFundExpenseV13(records: InsuranceSettlementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.fundExpense, 0);
  return Math.round(total * 100) / 100;
}

/**
 * 个人自付比例（纯函数）：自付金额/总费用×100，保留 2 位小数。
 *
 * @param records 医保结算明细记录列表
 * @returns 个人自付比例百分比
 */
export function computePersonalOutOfPocketRatioV13(records: InsuranceSettlementRecordV13[]): number {
  const totalCost = records.reduce((acc, r) => acc + r.totalCost, 0);
  if (totalCost === 0) return 0;
  const outOfPocket = records.reduce((acc, r) => acc + r.personalOutOfPocket, 0);
  return Math.round((outOfPocket / totalCost) * 10000) / 100;
}

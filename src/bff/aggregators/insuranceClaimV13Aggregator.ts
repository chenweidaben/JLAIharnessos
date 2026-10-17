/**
 * 健澜科技 jlmedaios - 医保申报 V13 纯函数（M382-A）
 *
 * computeInsuranceClaimCountV13 / computeInsuranceClaimAmountV13 / computeClaimPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医保申报记录 */
export interface InsuranceClaimRecordV13 {
  claimCount: number;
  claimAmount: number;
  passCount: number;
  totalCount: number;
}

/**
 * 医保申报人次（纯函数）：求和。
 *
 * @param records 医保申报记录列表
 * @returns 医保申报人次
 */
export function computeInsuranceClaimCountV13(records: InsuranceClaimRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.claimCount, 0);
}

/**
 * 医保申报金额（纯函数）：求和，单位元。
 *
 * @param records 医保申报记录列表
 * @returns 医保申报金额
 */
export function computeInsuranceClaimAmountV13(records: InsuranceClaimRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.claimAmount, 0);
}

/**
 * 申报通过率（纯函数）：通过数/申报总数×100，保留 2 位小数。
 *
 * @param records 医保申报记录列表
 * @returns 申报通过率百分比
 */
export function computeClaimPassRateV13(records: InsuranceClaimRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.passCount, 0);
  return Math.round((pass / total) * 10000) / 100;
}

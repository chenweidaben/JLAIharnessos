/**
 * 健澜科技 jlmedaios - 财务明细 V13 纯函数（M381-B）
 *
 * computeMedicalRevenueRatioV13 / computeDrugRevenueRatioV13 / computeMaterialRevenueRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 财务明细记录 */
export interface FinanceDetailRecordV13 {
  medicalRevenue: number;
  drugRevenue: number;
  materialRevenue: number;
  totalRevenue: number;
}

/**
 * 医疗收入占比（纯函数）：医疗收入/总收入×100，保留 2 位小数。
 *
 * @param records 财务明细记录列表
 * @returns 医疗收入占比百分比
 */
export function computeMedicalRevenueRatioV13(records: FinanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRevenue, 0);
  if (total === 0) return 0;
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  return Math.round((medical / total) * 10000) / 100;
}

/**
 * 药品收入占比（纯函数）：药品收入/总收入×100，保留 2 位小数。
 *
 * @param records 财务明细记录列表
 * @returns 药品收入占比百分比
 */
export function computeDrugRevenueRatioV13(records: FinanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRevenue, 0);
  if (total === 0) return 0;
  const drug = records.reduce((acc, r) => acc + r.drugRevenue, 0);
  return Math.round((drug / total) * 10000) / 100;
}

/**
 * 卫生材料收入占比（纯函数）：材料收入/总收入×100，保留 2 位小数。
 *
 * @param records 财务明细记录列表
 * @returns 卫生材料收入占比百分比
 */
export function computeMaterialRevenueRatioV13(records: FinanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRevenue, 0);
  if (total === 0) return 0;
  const material = records.reduce((acc, r) => acc + r.materialRevenue, 0);
  return Math.round((material / total) * 10000) / 100;
}

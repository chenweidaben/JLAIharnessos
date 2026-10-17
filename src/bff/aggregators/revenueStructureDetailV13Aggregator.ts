/**
 * 健澜科技 jlmedaios - 收入结构明细 V13 纯函数（M396-B，避让旧版 revenueStructureV13/revenueStructureStatsV13）
 *
 * computeMedicalRevenueRatioV13 / computeDrugRatioV13 / computeConsumableRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 收入结构明细记录 */
export interface RevenueStructureDetailRecordV13 {
  medicalRevenue: number;
  totalRevenue: number;
  drugRevenue: number;
  consumableRevenue: number;
}

/**
 * 医疗收入占比（纯函数）：医疗收入/总收入×100，保留 2 位小数。
 *
 * @param records 收入结构明细记录列表
 * @returns 医疗收入占比百分比
 */
export function computeMedicalRevenueRatioV13(records: RevenueStructureDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRevenue, 0);
  if (total === 0) return 0;
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  return Math.round((medical / total) * 10000) / 100;
}

/**
 * 药占比（纯函数）：药品收入/医疗收入×100，保留 2 位小数。
 *
 * @param records 收入结构明细记录列表
 * @returns 药占比百分比
 */
export function computeDrugRatioV13(records: RevenueStructureDetailRecordV13[]): number {
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (medical === 0) return 0;
  const drug = records.reduce((acc, r) => acc + r.drugRevenue, 0);
  return Math.round((drug / medical) * 10000) / 100;
}

/**
 * 耗占比（纯函数）：卫生材料收入/医疗收入×100，保留 2 位小数。
 *
 * @param records 收入结构明细记录列表
 * @returns 耗占比百分比
 */
export function computeConsumableRatioV13(records: RevenueStructureDetailRecordV13[]): number {
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (medical === 0) return 0;
  const consumable = records.reduce((acc, r) => acc + r.consumableRevenue, 0);
  return Math.round((consumable / medical) * 10000) / 100;
}

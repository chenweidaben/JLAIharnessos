/**
 * 健澜科技 jlmedaios - 业务收入结构 V13 纯函数（M345-B，stats 避让已有 revenueStructureV13）
 *
 * computeOutpatientRevenueV13 / computeInpatientRevenueV13 /
 * computeDrugRatioV13 / computeConsumableRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 业务收入结构记录 */
export interface RevenueStructureRecordV13 {
  outpatientRevenue: number;
  inpatientRevenue: number;
  drugRevenue: number;
  consumableRevenue: number;
}

/**
 * 门诊收入（纯函数）：求和（万元）。
 *
 * @param records 业务收入结构记录列表
 * @returns 门诊收入（万元）
 */
export function computeOutpatientRevenueV13(records: RevenueStructureRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outpatientRevenue, 0);
}

/**
 * 住院收入（纯函数）：求和（万元）。
 *
 * @param records 业务收入结构记录列表
 * @returns 住院收入（万元）
 */
export function computeInpatientRevenueV13(records: RevenueStructureRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.inpatientRevenue, 0);
}

/**
 * 总收入（纯函数）：门诊+住院（万元）。
 *
 * @param records 业务收入结构记录列表
 * @returns 总收入（万元）
 */
function totalRevenue(records: RevenueStructureRecordV13[]): number {
  return computeOutpatientRevenueV13(records) + computeInpatientRevenueV13(records);
}

/**
 * 药品占比（纯函数）：药品收入/总收入×100，保留 2 位小数。
 *
 * @param records 业务收入结构记录列表
 * @returns 药品占比百分比
 */
export function computeDrugRatioV13(records: RevenueStructureRecordV13[]): number {
  const total = totalRevenue(records);
  const drug = records.reduce((acc, r) => acc + r.drugRevenue, 0);
  if (total === 0) return 0;
  return Math.round((drug / total) * 10000) / 100;
}

/**
 * 耗材占比（纯函数）：耗材收入/总收入×100，保留 2 位小数。
 *
 * @param records 业务收入结构记录列表
 * @returns 耗材占比百分比
 */
export function computeConsumableRatioV13(records: RevenueStructureRecordV13[]): number {
  const total = totalRevenue(records);
  const consumable = records.reduce((acc, r) => acc + r.consumableRevenue, 0);
  if (total === 0) return 0;
  return Math.round((consumable / total) * 10000) / 100;
}

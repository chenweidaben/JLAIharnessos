/**
 * 健澜科技 jlmedaios - 成本控制明细 V13 纯函数（M396-C，避让旧版 costControlV13/medicalCostControlV13）
 *
 * computeDeptCostAccountingRateV13 / computeHundredYuanMedicalRevenueConsumableV13 / computePerCapitaOutpatientCostV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 成本控制明细记录 */
export interface CostControlDetailRecordV13 {
  accountedCount: number;
  totalCount: number;
  consumableCost: number;
  medicalRevenue: number;
  outpatientRevenue: number;
  outpatientCount: number;
}

/**
 * 科室成本核算率（纯函数）：已核算科室数/科室总数×100，保留 2 位小数。
 *
 * @param records 成本控制明细记录列表
 * @returns 科室成本核算率百分比
 */
export function computeDeptCostAccountingRateV13(records: CostControlDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const accounted = records.reduce((acc, r) => acc + r.accountedCount, 0);
  return Math.round((accounted / total) * 10000) / 100;
}

/**
 * 百元医疗收入消耗卫生材料（纯函数）：卫生材料消耗金额/医疗收入×100，保留 2 位小数，元。
 *
 * @param records 成本控制明细记录列表
 * @returns 百元医疗收入消耗卫生材料金额（元）
 */
export function computeHundredYuanMedicalRevenueConsumableV13(records: CostControlDetailRecordV13[]): number {
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (medical === 0) return 0;
  const consumable = records.reduce((acc, r) => acc + r.consumableCost, 0);
  return Math.round((consumable / medical) * 10000) / 100;
}

/**
 * 人均门诊费用（纯函数）：门诊总收入/门诊人次，保留 2 位小数，元。
 *
 * @param records 成本控制明细记录列表
 * @returns 人均门诊费用（元）
 */
export function computePerCapitaOutpatientCostV13(records: CostControlDetailRecordV13[]): number {
  const count = records.reduce((acc, r) => acc + r.outpatientCount, 0);
  if (count === 0) return 0;
  const revenue = records.reduce((acc, r) => acc + r.outpatientRevenue, 0);
  return Math.round((revenue / count) * 100) / 100;
}

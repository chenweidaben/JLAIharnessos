/**
 * 健澜科技 jlmedaios - 能耗质量管理 V13 纯函数（M435-D，M435 收官，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
 *
 * computeEnergyReductionRateV13 / computeWaterElectricityGasSavingRateV13 / computeEnergyCostControlRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 能耗质量管理记录 */
export interface EnergyQualityMgmtRecordV13 {
  previousEnergy: number;
  currentEnergy: number;
  savingUsage: number;
  previousUsage: number;
  currentCost: number;
  budgetCost: number;
}

/**
 * 能耗降低率（纯函数，正向指标，越高越好）：(上期能耗-本期能耗)/上期能耗×100，保留 2 位小数。
 *
 * @param records 能耗质量管理记录列表
 * @returns 能耗降低率百分比
 */
export function computeEnergyReductionRateV13(records: EnergyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.previousEnergy, 0);
  if (total === 0) return 0;
  const reduction = records.reduce((acc, r) => acc + (r.previousEnergy - r.currentEnergy), 0);
  return Math.round((reduction / total) * 10000) / 100;
}

/**
 * 水电气节约率（纯函数，正向指标，越高越好）：节约用量/上期用量×100，保留 2 位小数。
 *
 * @param records 能耗质量管理记录列表
 * @returns 水电气节约率百分比
 */
export function computeWaterElectricityGasSavingRateV13(records: EnergyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.previousUsage, 0);
  if (total === 0) return 0;
  const saving = records.reduce((acc, r) => acc + r.savingUsage, 0);
  return Math.round((saving / total) * 10000) / 100;
}

/**
 * 能耗成本控制率（纯函数，反向指标，越低越好）：本期能耗成本/预算能耗成本×100，保留 2 位小数。
 *
 * @param records 能耗质量管理记录列表
 * @returns 能耗成本控制率百分比
 */
export function computeEnergyCostControlRateV13(records: EnergyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.budgetCost, 0);
  if (total === 0) return 0;
  const current = records.reduce((acc, r) => acc + r.currentCost, 0);
  return Math.round((current / total) * 10000) / 100;
}

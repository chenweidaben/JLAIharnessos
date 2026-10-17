/**
 * 健澜科技 jlmedaios - 能耗管理 V13 纯函数（M352-B）
 *
 * computeMonthlyWaterUsageV13 / computeMonthlyElectricityUsageV13 / computePerTenThousandRevenueEnergyV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 能耗管理记录 */
export interface EnergyConsumptionRecordV13 {
  monthlyWaterUsage: number;
  monthlyElectricityUsage: number;
  comprehensiveEnergyCoal: number;
  businessRevenueYuan: number;
}

/**
 * 月度用水量（纯函数）：求和，单位吨。
 *
 * @param records 能耗管理记录列表
 * @returns 月度用水量（吨）
 */
export function computeMonthlyWaterUsageV13(records: EnergyConsumptionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.monthlyWaterUsage, 0);
}

/**
 * 月度用电量（纯函数）：求和，单位 kWh。
 *
 * @param records 能耗管理记录列表
 * @returns 月度用电量（kWh）
 */
export function computeMonthlyElectricityUsageV13(records: EnergyConsumptionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.monthlyElectricityUsage, 0);
}

/**
 * 万元业务收入能耗（纯函数）：综合能耗/业务收入×10000，吨标煤/万元，保留 2 位小数。
 *
 * @param records 能耗管理记录列表
 * @returns 万元业务收入能耗（吨标煤/万元）
 */
export function computePerTenThousandRevenueEnergyV13(records: EnergyConsumptionRecordV13[]): number {
  const energy = records.reduce((acc, r) => acc + r.comprehensiveEnergyCoal, 0);
  const revenue = records.reduce((acc, r) => acc + r.businessRevenueYuan, 0);
  if (revenue === 0) return 0;
  return Math.round((energy / revenue) * 10000 * 100) / 100;
}

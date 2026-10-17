/**
 * 健澜科技 jlmedaios - 能源管理明细 V13 纯函数（M385-C）
 *
 * computeMonthlyElectricityUsageV13 / computeMonthlyWaterUsageV13 / computeMonthlyGasUsageV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 能源管理明细记录 */
export interface EnergyMgmtDetailRecordV13 {
  electricityUsage: number;
  waterUsage: number;
  gasUsage: number;
}

/**
 * 月度用电量（纯函数）：求和。
 *
 * @param records 能源管理明细记录列表
 * @returns 月度用电量（kWh）
 */
export function computeMonthlyElectricityUsageV13(records: EnergyMgmtDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.electricityUsage, 0);
}

/**
 * 月度用水量（纯函数）：求和。
 *
 * @param records 能源管理明细记录列表
 * @returns 月度用水量（吨）
 */
export function computeMonthlyWaterUsageV13(records: EnergyMgmtDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.waterUsage, 0);
}

/**
 * 月度用气量（纯函数）：求和。
 *
 * @param records 能源管理明细记录列表
 * @returns 月度用气量（立方米）
 */
export function computeMonthlyGasUsageV13(records: EnergyMgmtDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.gasUsage, 0);
}

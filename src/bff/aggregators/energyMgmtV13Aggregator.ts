/**
 * 健澜科技 jlmedaios - 能源管理 V13 纯函数（M377-C）
 *
 * computeMonthlyElectricityUsageV13 / computeMonthlyWaterUsageV13 / computeEnergyYoYDeclineRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 能源管理记录 */
export interface EnergyMgmtRecordV13 {
  electricityUsage: number;
  waterUsage: number;
  lastYearElectricity: number;
  currentYearElectricity: number;
}

/**
 * 月用电量（纯函数）：求和，单位 kWh。
 *
 * @param records 能源管理记录列表
 * @returns 月用电量
 */
export function computeMonthlyElectricityUsageV13(records: EnergyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.electricityUsage, 0);
}

/**
 * 月用水量（纯函数）：求和，单位吨。
 *
 * @param records 能源管理记录列表
 * @returns 月用水量
 */
export function computeMonthlyWaterUsageV13(records: EnergyMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.waterUsage, 0);
}

/**
 * 能耗同比下降率（纯函数）：(去年同期-本期)/去年同期×100，保留 2 位小数。
 *
 * @param records 能源管理记录列表
 * @returns 能耗同比下降率百分比
 */
export function computeEnergyYoYDeclineRateV13(records: EnergyMgmtRecordV13[]): number {
  const lastYear = records.reduce((acc, r) => acc + r.lastYearElectricity, 0);
  if (lastYear === 0) return 0;
  const currentYear = records.reduce((acc, r) => acc + r.currentYearElectricity, 0);
  return Math.round(((lastYear - currentYear) / lastYear) * 10000) / 100;
}

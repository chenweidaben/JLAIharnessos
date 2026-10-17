/**
 * 健澜科技 jlmedaios - 氧气供应 V13 纯函数（M351-C）
 *
 * computeLiquidOxygenConsumptionV13 / computeSuctionAnomalyCountV13 / computeOxygenSupplyPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 氧气供应记录 */
export interface OxygenSupplyRecordV13 {
  liquidOxygenConsumption: number;
  suctionAnomalyCount: number;
  oxygenTestCount: number;
  oxygenPassedCount: number;
}

/**
 * 液氧消耗量（纯函数）：求和，单位升。
 *
 * @param records 氧气供应记录列表
 * @returns 液氧消耗量（升）
 */
export function computeLiquidOxygenConsumptionV13(records: OxygenSupplyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.liquidOxygenConsumption, 0);
}

/**
 * 负压吸引异常次数（纯函数）：求和。
 *
 * @param records 氧气供应记录列表
 * @returns 负压吸引异常次数
 */
export function computeSuctionAnomalyCountV13(records: OxygenSupplyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.suctionAnomalyCount, 0);
}

/**
 * 中心供氧合格率（纯函数）：合格数/检测数×100，保留 2 位小数。
 *
 * @param records 氧气供应记录列表
 * @returns 中心供氧合格率百分比
 */
export function computeOxygenSupplyPassRateV13(records: OxygenSupplyRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.oxygenPassedCount, 0);
  const tested = records.reduce((acc, r) => acc + r.oxygenTestCount, 0);
  if (tested === 0) return 0;
  return Math.round((passed / tested) * 10000) / 100;
}

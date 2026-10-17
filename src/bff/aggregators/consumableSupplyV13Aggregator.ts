/**
 * 健澜科技 jlmedaios - 耗材供应 V13 纯函数（M408-B）
 *
 * computeHighValueConsumableTraceabilityRateV13 / computeConsumableInventoryTurnoverDaysV13 / computeConsumableStockoutRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 耗材供应记录 */
export interface ConsumableSupplyRecordV13 {
  traceable: number;
  total: number;
  turnoverDays: number;
  stockout: number;
  purchase: number;
}

/**
 * 高值耗材追溯率（纯函数）：可追溯高值耗材数/高值耗材总数×100，保留 2 位小数。
 *
 * @param records 耗材供应记录列表
 * @returns 高值耗材追溯率百分比
 */
export function computeHighValueConsumableTraceabilityRateV13(records: ConsumableSupplyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const traceable = records.reduce((acc, r) => acc + r.traceable, 0);
  return Math.round((traceable / total) * 10000) / 100;
}

/**
 * 耗材库存周转天数（纯函数）：平均值，单位天，Math.ceil 向上取整到整天。
 *
 * @param records 耗材供应记录列表
 * @returns 耗材库存周转天数（整天）
 */
export function computeConsumableInventoryTurnoverDaysV13(records: ConsumableSupplyRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.turnoverDays, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}

/**
 * 耗材断货率（纯函数）：断货次数/采购总次数×100，保留 2 位小数。
 *
 * @param records 耗材供应记录列表
 * @returns 耗材断货率百分比
 */
export function computeConsumableStockoutRateV13(records: ConsumableSupplyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.purchase, 0);
  if (total === 0) return 0;
  const stockout = records.reduce((acc, r) => acc + r.stockout, 0);
  return Math.round((stockout / total) * 10000) / 100;
}

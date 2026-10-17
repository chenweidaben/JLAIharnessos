/**
 * 健澜科技 jlmedaios - 消防安全 V13 纯函数（M352-A）
 *
 * computeMonthlyInspectionCountV13 / computeHazardRectificationRateV13 / computeDrillCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 消防安全记录 */
export interface FireSafetyRecordV13 {
  monthlyInspectionCount: number;
  hazardFoundCount: number;
  hazardRectifiedCount: number;
  drillCount: number;
}

/**
 * 月度消防检查次数（纯函数）：求和。
 *
 * @param records 消防安全记录列表
 * @returns 月度消防检查次数
 */
export function computeMonthlyInspectionCountV13(records: FireSafetyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.monthlyInspectionCount, 0);
}

/**
 * 隐患整改率（纯函数）：已整改数/发现隐患数×100，保留 2 位小数。
 *
 * @param records 消防安全记录列表
 * @returns 隐患整改率百分比
 */
export function computeHazardRectificationRateV13(records: FireSafetyRecordV13[]): number {
  const rectified = records.reduce((acc, r) => acc + r.hazardRectifiedCount, 0);
  const found = records.reduce((acc, r) => acc + r.hazardFoundCount, 0);
  if (found === 0) return 0;
  return Math.round((rectified / found) * 10000) / 100;
}

/**
 * 应急演练次数（纯函数）：求和。
 *
 * @param records 消防安全记录列表
 * @returns 应急演练次数
 */
export function computeDrillCountV13(records: FireSafetyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.drillCount, 0);
}

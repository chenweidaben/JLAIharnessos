/**
 * 健澜科技 jlmedaios - 消防安全明细 V13 纯函数（M408-C）
 *
 * computeFireFacilityIntegrityRateV13 / computeFireDrillCountV13 / computeFireHazardRectificationRateV13
 *
 * 避让旧版 fireSafetyV13（M352-A：月度检查次数/隐患整改率/演练次数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 消防安全明细记录 */
export interface FireSafetyDetailRecordV13 {
  facilityIntact: number;
  facilityTotal: number;
  drillCount: number;
  hazardRectified: number;
  hazardFound: number;
}

/**
 * 消防设施完好率（纯函数）：完好设施数/设施总数×100，保留 2 位小数。
 *
 * @param records 消防安全明细记录列表
 * @returns 消防设施完好率百分比
 */
export function computeFireFacilityIntegrityRateV13(records: FireSafetyDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.facilityTotal, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.facilityIntact, 0);
  return Math.round((intact / total) * 10000) / 100;
}

/**
 * 消防演练次数（纯函数）：求和。
 *
 * @param records 消防安全明细记录列表
 * @returns 消防演练次数
 */
export function computeFireDrillCountV13(records: FireSafetyDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.drillCount, 0);
}

/**
 * 火灾隐患整改率（纯函数）：已整改隐患数/排查隐患总数×100，保留 2 位小数。
 *
 * @param records 消防安全明细记录列表
 * @returns 火灾隐患整改率百分比
 */
export function computeFireHazardRectificationRateV13(records: FireSafetyDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.hazardFound, 0);
  if (total === 0) return 0;
  const rectified = records.reduce((acc, r) => acc + r.hazardRectified, 0);
  return Math.round((rectified / total) * 10000) / 100;
}

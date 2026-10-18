/**
 * 健澜科技 jlmedaios - 消防安全质量管理 V13 纯函数（M431-C，-quality 后缀避让旧版 fireSafetyDetailV13（M408））
 *
 * computeFireFacilityCompletenessRateV13 / computeFireDrillCountV13 / computeFireHazardRectificationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 消防安全质量管理记录 */
export interface FireSafetyQualityMgmtRecordV13 {
  facilityIntact: number;
  facilityTotal: number;
  drillCount: number;
  rectified: number;
  hazardTotal: number;
}

/**
 * 消防设施完好率（纯函数）：完好消防设施数/消防设施总数×100，保留 2 位小数。
 *
 * @param records 消防安全质量管理记录列表
 * @returns 消防设施完好率百分比
 */
export function computeFireFacilityCompletenessRateV13(records: FireSafetyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.facilityTotal, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.facilityIntact, 0);
  return Math.round((intact / total) * 10000) / 100;
}

/**
 * 消防演练次数（纯函数，整数求和类，单位次）：对 drillCount 求和。
 *
 * @param records 消防安全质量管理记录列表
 * @returns 消防演练次数（整数次）
 */
export function computeFireDrillCountV13(records: FireSafetyQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.drillCount, 0);
}

/**
 * 火灾隐患整改率（纯函数）：已整改隐患数/发现隐患总数×100，保留 2 位小数。
 *
 * @param records 消防安全质量管理记录列表
 * @returns 火灾隐患整改率百分比
 */
export function computeFireHazardRectificationRateV13(records: FireSafetyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.hazardTotal, 0);
  if (total === 0) return 0;
  const rectified = records.reduce((acc, r) => acc + r.rectified, 0);
  return Math.round((rectified / total) * 10000) / 100;
}

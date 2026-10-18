/**
 * 健澜科技 jlmedaios - 消防安全管理 V13 纯函数（M447-D，M447 收官，应急管理与安全生产管理组）
 *
 * computeFireSafetyFacilityIntegrityRateV13 / computeFireSafetyPassageClearRateV13 / computeFireSafetyFireCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 消防安全管理记录 */
export interface FireSafetyMgmtRecordV13 {
  intact: number;
  totalFacility: number;
  clear: number;
  totalPassage: number;
  fire: boolean;
}

/**
 * 消防设施完好率（纯函数）：完好消防设施数/消防设施总数×100，保留 2 位小数。
 *
 * @param records 消防安全管理记录列表
 * @returns 消防设施完好率百分比
 */
export function computeFireSafetyFacilityIntegrityRateV13(records: FireSafetyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFacility, 0);
  if (total === 0) return 0;
  const intactCount = records.reduce((acc, r) => acc + r.intact, 0);
  return Math.round((intactCount / total) * 10000) / 100;
}

/**
 * 消防通道畅通率（纯函数）：畅通通道数/通道总数×100，保留 2 位小数。
 *
 * @param records 消防安全管理记录列表
 * @returns 消防通道畅通率百分比
 */
export function computeFireSafetyPassageClearRateV13(records: FireSafetyMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPassage, 0);
  if (total === 0) return 0;
  const clearCount = records.reduce((acc, r) => acc + r.clear, 0);
  return Math.round((clearCount / total) * 10000) / 100;
}

/**
 * 火灾事故数（纯函数，计数指标，反向指标越低越好）：返回 records.filter(r => r.fire).length。
 *
 * @param records 消防安全管理记录列表
 * @returns 火灾事故数（整数）
 */
export function computeFireSafetyFireCountV13(records: FireSafetyMgmtRecordV13[]): number {
  return records.filter((r) => r.fire).length;
}

/**
 * 健澜科技 jlmedaios - 急救药品管理 V13 纯函数（M388-D，M388 收官）
 *
 * computeEmergencyCartDrugCompletenessRateV13 / computeNearExpiryDrugRatioV13 / computeEmergencyDrugInventoryAccuracyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急救药品管理记录 */
export interface EmergencyDrugMgmtRecordV13 {
  completeCount: number;
  shouldCount: number;
  nearExpiryCount: number;
  totalCount: number;
  matchedCount: number;
  inventoryTotalCount: number;
}

/**
 * 急救车药品齐备率（纯函数）：齐备药品种数/应备药品种数×100，保留 2 位小数。
 *
 * @param records 急救药品管理记录列表
 * @returns 急救车药品齐备率百分比
 */
export function computeEmergencyCartDrugCompletenessRateV13(records: EmergencyDrugMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.completeCount, 0);
  return Math.round((complete / should) * 10000) / 100;
}

/**
 * 近效期药品占比（纯函数）：近效期药品种数/总药品种数×100，保留 2 位小数。
 *
 * @param records 急救药品管理记录列表
 * @returns 近效期药品占比百分比
 */
export function computeNearExpiryDrugRatioV13(records: EmergencyDrugMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const nearExpiry = records.reduce((acc, r) => acc + r.nearExpiryCount, 0);
  return Math.round((nearExpiry / total) * 10000) / 100;
}

/**
 * 急救药品盘点准确率（纯函数）：账物相符品种数/盘点品种总数×100，保留 2 位小数。
 *
 * @param records 急救药品管理记录列表
 * @returns 急救药品盘点准确率百分比
 */
export function computeEmergencyDrugInventoryAccuracyRateV13(records: EmergencyDrugMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inventoryTotalCount, 0);
  if (total === 0) return 0;
  const matched = records.reduce((acc, r) => acc + r.matchedCount, 0);
  return Math.round((matched / total) * 10000) / 100;
}

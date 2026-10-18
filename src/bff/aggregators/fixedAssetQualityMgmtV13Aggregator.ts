/**
 * 健澜科技 jlmedaios - 固定资产质量管理 V13 纯函数（M435-C，-quality 后缀避让旧版固定资产模块（M408 medicalDeviceMgmtV13 等））
 *
 * computeFixedAssetUtilizationRateV13 / computeFixedAssetCompletenessRateV13 / computeFixedAssetInventoryAccuracyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 固定资产质量管理记录 */
export interface FixedAssetQualityMgmtRecordV13 {
  actualUsageHours: number;
  shouldUsageHours: number;
  intactAssets: number;
  totalAssets: number;
  matchedAssets: number;
  totalInventoryAssets: number;
}

/**
 * 资产利用率（纯函数）：实际使用工时/应使用工时×100，保留 2 位小数。
 *
 * @param records 固定资产质量管理记录列表
 * @returns 资产利用率百分比
 */
export function computeFixedAssetUtilizationRateV13(records: FixedAssetQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldUsageHours, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualUsageHours, 0);
  return Math.round((actual / total) * 10000) / 100;
}

/**
 * 资产完好率（纯函数）：完好资产数/资产总数×100，保留 2 位小数。
 *
 * @param records 固定资产质量管理记录列表
 * @returns 资产完好率百分比
 */
export function computeFixedAssetCompletenessRateV13(records: FixedAssetQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAssets, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.intactAssets, 0);
  return Math.round((intact / total) * 10000) / 100;
}

/**
 * 资产盘点准确率（纯函数）：账实相符资产数/盘点资产总数×100，保留 2 位小数。
 *
 * @param records 固定资产质量管理记录列表
 * @returns 资产盘点准确率百分比
 */
export function computeFixedAssetInventoryAccuracyRateV13(records: FixedAssetQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalInventoryAssets, 0);
  if (total === 0) return 0;
  const matched = records.reduce((acc, r) => acc + r.matchedAssets, 0);
  return Math.round((matched / total) * 10000) / 100;
}

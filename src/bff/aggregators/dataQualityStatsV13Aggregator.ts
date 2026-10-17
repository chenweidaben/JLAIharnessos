/**
 * 健澜科技 jlmedaios - 数据质量 V13 纯函数（M353-B，stats 避让已有 dataQualityV13）
 *
 * computeIntegrityRateV13 / computeAccuracyRateV13 / computeMasterDataConsistencyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据质量记录 */
export interface DataQualityStatsRecordV13 {
  integrityPassedCount: number;
  integrityCheckedCount: number;
  accuracyPassedCount: number;
  accuracyCheckedCount: number;
  masterConsistentCount: number;
  masterComparedCount: number;
}

/**
 * 数据完整性合格率（纯函数）：合格数/检查数×100，保留 2 位小数。
 *
 * @param records 数据质量记录列表
 * @returns 数据完整性合格率百分比
 */
export function computeIntegrityRateV13(records: DataQualityStatsRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.integrityPassedCount, 0);
  const checked = records.reduce((acc, r) => acc + r.integrityCheckedCount, 0);
  if (checked === 0) return 0;
  return Math.round((passed / checked) * 10000) / 100;
}

/**
 * 数据准确性合格率（纯函数）：准确数/检查数×100，保留 2 位小数。
 *
 * @param records 数据质量记录列表
 * @returns 数据准确性合格率百分比
 */
export function computeAccuracyRateV13(records: DataQualityStatsRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.accuracyPassedCount, 0);
  const checked = records.reduce((acc, r) => acc + r.accuracyCheckedCount, 0);
  if (checked === 0) return 0;
  return Math.round((passed / checked) * 10000) / 100;
}

/**
 * 主数据一致性合格率（纯函数）：一致数/比对数×100，保留 2 位小数。
 *
 * @param records 数据质量记录列表
 * @returns 主数据一致性合格率百分比
 */
export function computeMasterDataConsistencyRateV13(records: DataQualityStatsRecordV13[]): number {
  const consistent = records.reduce((acc, r) => acc + r.masterConsistentCount, 0);
  const compared = records.reduce((acc, r) => acc + r.masterComparedCount, 0);
  if (compared === 0) return 0;
  return Math.round((consistent / compared) * 10000) / 100;
}

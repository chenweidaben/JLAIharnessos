/**
 * 健澜科技 jlmedaios - 数据治理明细 V13 纯函数（M401-B，避让旧版 dataGovernanceV13/dataGovernanceStatsV13）
 *
 * computeDataQualityScoreV13 / computeMasterDataConsistencyRateV13 / computeDataStandardAdoptionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据治理明细记录 */
export interface DataGovernanceDetailRecordV13 {
  qualityScore: number;
  consistent: number;
  totalChecked: number;
  adopted: number;
  totalStandards: number;
}

/**
 * 数据质量评分（纯函数）：平均值，保留 2 位小数。
 *
 * @param records 数据治理明细记录列表
 * @returns 数据质量评分平均分
 */
export function computeDataQualityScoreV13(records: DataGovernanceDetailRecordV13[]): number {
  if (records.length === 0) return 0;
  const avg = records.reduce((acc, r) => acc + r.qualityScore, 0) / records.length;
  return Math.round(avg * 100) / 100;
}

/**
 * 主数据一致性率（纯函数）：一致数/校验总数×100，保留 2 位小数。
 *
 * @param records 数据治理明细记录列表
 * @returns 主数据一致性率百分比
 */
export function computeMasterDataConsistencyRateV13(records: DataGovernanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalChecked, 0);
  if (total === 0) return 0;
  const consistent = records.reduce((acc, r) => acc + r.consistent, 0);
  return Math.round((consistent / total) * 10000) / 100;
}

/**
 * 数据标准落地率（纯函数）：落地标准数/应落地标准数×100，保留 2 位小数。
 *
 * @param records 数据治理明细记录列表
 * @returns 数据标准落地率百分比
 */
export function computeDataStandardAdoptionRateV13(records: DataGovernanceDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalStandards, 0);
  if (total === 0) return 0;
  const adopted = records.reduce((acc, r) => acc + r.adopted, 0);
  return Math.round((adopted / total) * 10000) / 100;
}

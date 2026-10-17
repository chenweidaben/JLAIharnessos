/**
 * 健澜科技 jlmedaios - 数据治理 V13（统计）纯函数（M363-D，stats避让）
 *
 * computeDataQualityPassRateV13 / computeDataStandardCoverageRateV13 / computeMetadataManagementRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据治理（统计）记录 */
export interface DataGovernanceStatsRecordV13 {
  qualityPassed: number;
  qualityChecked: number;
  standardCovered: number;
  standardTotal: number;
  metadataManaged: number;
  metadataRequired: number;
}

/**
 * 数据质量合格率（纯函数）：合格记录数/检查记录数×100，保留 2 位小数。
 *
 * @param records 数据治理记录列表
 * @returns 数据质量合格率百分比
 */
export function computeDataQualityPassRateV13(records: DataGovernanceStatsRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.qualityPassed, 0);
  const checked = records.reduce((acc, r) => acc + r.qualityChecked, 0);
  if (checked === 0) return 0;
  return Math.round((passed / checked) * 10000) / 100;
}

/**
 * 数据标准覆盖率（纯函数）：符合标准字段数/总字段数×100，保留 2 位小数。
 *
 * @param records 数据治理记录列表
 * @returns 数据标准覆盖率百分比
 */
export function computeDataStandardCoverageRateV13(records: DataGovernanceStatsRecordV13[]): number {
  const covered = records.reduce((acc, r) => acc + r.standardCovered, 0);
  const total = records.reduce((acc, r) => acc + r.standardTotal, 0);
  if (total === 0) return 0;
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 元数据管理率（纯函数）：已纳管元数据数/应纳管元数据数×100，保留 2 位小数。
 *
 * @param records 数据治理记录列表
 * @returns 元数据管理率百分比
 */
export function computeMetadataManagementRateV13(records: DataGovernanceStatsRecordV13[]): number {
  const managed = records.reduce((acc, r) => acc + r.metadataManaged, 0);
  const required = records.reduce((acc, r) => acc + r.metadataRequired, 0);
  if (required === 0) return 0;
  return Math.round((managed / required) * 10000) / 100;
}

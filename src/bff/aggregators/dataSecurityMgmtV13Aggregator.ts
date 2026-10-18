/**
 * 健澜科技 jlmedaios - 数据安全管理 V13 纯函数（M446-B，信息化建设与数据安全管理组）
 *
 * computeDataSecurityClassificationCoverageRateV13 / computeDataSecurityMaskingRateV13 / computeDataSecurityIncidentCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据安全管理记录 */
export interface DataSecurityMgmtRecordV13 {
  classified: number;
  totalAssets: number;
  masked: number;
  totalSensitive: number;
  securityIncident: boolean;
}

/**
 * 数据分级分类覆盖率（纯函数）：已分级分类数据资产数/数据资产总数×100，保留 2 位小数。
 *
 * @param records 数据安全管理记录列表
 * @returns 数据分级分类覆盖率百分比
 */
export function computeDataSecurityClassificationCoverageRateV13(records: DataSecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAssets, 0);
  if (total === 0) return 0;
  const classifiedCount = records.reduce((acc, r) => acc + r.classified, 0);
  return Math.round((classifiedCount / total) * 10000) / 100;
}

/**
 * 敏感数据脱敏率（纯函数）：已脱敏敏感数据字段数/敏感数据字段总数×100，保留 2 位小数。
 *
 * @param records 数据安全管理记录列表
 * @returns 敏感数据脱敏率百分比
 */
export function computeDataSecurityMaskingRateV13(records: DataSecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSensitive, 0);
  if (total === 0) return 0;
  const maskedCount = records.reduce((acc, r) => acc + r.masked, 0);
  return Math.round((maskedCount / total) * 10000) / 100;
}

/**
 * 数据安全事件数（纯函数，计数指标，反向指标越低越好）：返回 records.filter(r => r.securityIncident).length。
 *
 * @param records 数据安全管理记录列表
 * @returns 数据安全事件数（整数）
 */
export function computeDataSecurityIncidentCountV13(records: DataSecurityMgmtRecordV13[]): number {
  return records.filter((r) => r.securityIncident).length;
}

/**
 * 健澜科技 jlmedaios - 备份与容灾 V13 纯函数（M353-D，M353 收官）
 *
 * computeBackupSuccessRateV13 / computeRTOComplianceRateV13 / computeRPOComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 备份与容灾记录 */
export interface BackupDRRecordV13 {
  backupSuccessCount: number;
  backupTotalCount: number;
  rtoPassedCount: number;
  rtoTestedCount: number;
  rpoPassedCount: number;
  rpoTestedCount: number;
}

/**
 * 备份成功率（纯函数）：成功次数/总备份次数×100，保留 2 位小数。
 *
 * @param records 备份与容灾记录列表
 * @returns 备份成功率百分比
 */
export function computeBackupSuccessRateV13(records: BackupDRRecordV13[]): number {
  const success = records.reduce((acc, r) => acc + r.backupSuccessCount, 0);
  const total = records.reduce((acc, r) => acc + r.backupTotalCount, 0);
  if (total === 0) return 0;
  return Math.round((success / total) * 10000) / 100;
}

/**
 * RTO 达标率（纯函数）：达标次数/RTO 测试次数×100，保留 2 位小数。
 *
 * @param records 备份与容灾记录列表
 * @returns RTO 达标率百分比
 */
export function computeRTOComplianceRateV13(records: BackupDRRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.rtoPassedCount, 0);
  const tested = records.reduce((acc, r) => acc + r.rtoTestedCount, 0);
  if (tested === 0) return 0;
  return Math.round((passed / tested) * 10000) / 100;
}

/**
 * RPO 达标率（纯函数）：达标次数/RPO 测试次数×100，保留 2 位小数。
 *
 * @param records 备份与容灾记录列表
 * @returns RPO 达标率百分比
 */
export function computeRPOComplianceRateV13(records: BackupDRRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.rpoPassedCount, 0);
  const tested = records.reduce((acc, r) => acc + r.rpoTestedCount, 0);
  if (tested === 0) return 0;
  return Math.round((passed / tested) * 10000) / 100;
}

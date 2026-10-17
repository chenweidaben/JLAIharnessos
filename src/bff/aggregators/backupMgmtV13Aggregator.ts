/**
 * 健澜科技 jlmedaios - 备份管理 V13 纯函数（M379-B）
 *
 * computeBackupTaskTotalCountV13 / computeBackupSuccessRateV13 / computeAvgRecoveryTimeHoursV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 备份管理记录 */
export interface BackupMgmtRecordV13 {
  backupTaskCount: number;
  backupSuccessCount: number;
  recoveryCount: number;
  recoveryHours: number;
}

/**
 * 备份任务总数（纯函数）：求和。
 *
 * @param records 备份管理记录列表
 * @returns 备份任务总数
 */
export function computeBackupTaskTotalCountV13(records: BackupMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.backupTaskCount, 0);
}

/**
 * 备份成功率（纯函数）：成功数/任务总数×100，保留 2 位小数。
 *
 * @param records 备份管理记录列表
 * @returns 备份成功率百分比
 */
export function computeBackupSuccessRateV13(records: BackupMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.backupTaskCount, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.backupSuccessCount, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * 数据恢复平均时长（纯函数）：总恢复小时数/恢复次数，保留 2 位小数。
 *
 * @param records 备份管理记录列表
 * @returns 数据恢复平均时长（小时）
 */
export function computeAvgRecoveryTimeHoursV13(records: BackupMgmtRecordV13[]): number {
  const recovery = records.reduce((acc, r) => acc + r.recoveryCount, 0);
  if (recovery === 0) return 0;
  const hours = records.reduce((acc, r) => acc + r.recoveryHours, 0);
  return Math.round((hours / recovery) * 100) / 100;
}

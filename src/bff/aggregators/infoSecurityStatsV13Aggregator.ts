/**
 * 健澜科技 jlmedaios - 信息安全 V13（统计）纯函数（M363-A，stats避让）
 *
 * computeInfoSecurityIncidentCountV13 / computeSystemAvailabilityRateV13 / computeDataBackupSuccessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息安全（统计）记录 */
export interface InfoSecurityStatsRecordV13 {
  incidentCount: number;
  availableHours: number;
  requiredHours: number;
  backupSuccess: number;
  backupTotal: number;
}

/**
 * 信息安全事件起数（纯函数）：求和。
 *
 * @param records 信息安全记录列表
 * @returns 信息安全事件起数
 */
export function computeInfoSecurityIncidentCountV13(records: InfoSecurityStatsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.incidentCount, 0);
}

/**
 * 信息系统可用率（纯函数）：可用时长/应运行时长×100，保留 2 位小数。
 *
 * @param records 信息安全记录列表
 * @returns 信息系统可用率百分比
 */
export function computeSystemAvailabilityRateV13(records: InfoSecurityStatsRecordV13[]): number {
  const available = records.reduce((acc, r) => acc + r.availableHours, 0);
  const required = records.reduce((acc, r) => acc + r.requiredHours, 0);
  if (required === 0) return 0;
  return Math.round((available / required) * 10000) / 100;
}

/**
 * 数据备份成功率（纯函数）：成功次数/备份次数×100，保留 2 位小数。
 *
 * @param records 信息安全记录列表
 * @returns 数据备份成功率百分比
 */
export function computeDataBackupSuccessRateV13(records: InfoSecurityStatsRecordV13[]): number {
  const success = records.reduce((acc, r) => acc + r.backupSuccess, 0);
  const total = records.reduce((acc, r) => acc + r.backupTotal, 0);
  if (total === 0) return 0;
  return Math.round((success / total) * 10000) / 100;
}

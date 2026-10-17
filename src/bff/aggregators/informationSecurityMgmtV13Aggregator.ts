/**
 * 健澜科技 jlmedaios - 信息安全管理 V13 纯函数（M419-B）
 *
 * computeInfoSecEventResponseHoursV13 / computeDataBackupSuccessRateV13 / computeSystemVulnFixTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息安全管理记录 */
export interface InformationSecurityMgmtRecordV13 {
  responseHours: number;
  backupSuccess: number;
  backupTotal: number;
  vulnFixTimely: number;
  vulnTotal: number;
}

/**
 * 信息安全事件响应时间（纯函数，Math.ceil 整小时）：响应时间平均值向上取整到整小时。
 *
 * @param records 信息安全管理记录列表
 * @returns 响应时间（整小时）
 */
export function computeInfoSecEventResponseHoursV13(records: InformationSecurityMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.responseHours, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}

/**
 * 数据备份成功率（纯函数）：成功备份次数/备份总次数×100，保留 2 位小数。
 *
 * @param records 信息安全管理记录列表
 * @returns 数据备份成功率百分比
 */
export function computeDataBackupSuccessRateV13(records: InformationSecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.backupTotal, 0);
  if (total === 0) return 0;
  const backupSuccess = records.reduce((acc, r) => acc + r.backupSuccess, 0);
  return Math.round((backupSuccess / total) * 10000) / 100;
}

/**
 * 系统漏洞修复及时率（纯函数）：及时修复数/漏洞总数×100，保留 2 位小数。
 *
 * @param records 信息安全管理记录列表
 * @returns 系统漏洞修复及时率百分比
 */
export function computeSystemVulnFixTimelyRateV13(records: InformationSecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.vulnTotal, 0);
  if (total === 0) return 0;
  const vulnFixTimely = records.reduce((acc, r) => acc + r.vulnFixTimely, 0);
  return Math.round((vulnFixTimely / total) * 10000) / 100;
}

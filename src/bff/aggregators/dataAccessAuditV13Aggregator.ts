/**
 * 健澜科技 jlmedaios - 数据访问审计异常 V13 纯函数（M318-D）
 *
 * detectAfterHoursAccessV13 / detectOverAccessV13 / detectBulkExportV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据访问日志 */
export interface DataAccessLogV13 {
  logId: string;
  userId: string;
  accessHour: number;
  hasPermission: boolean;
  exportRecordCount: number;
}

/**
 * 非工作时间访问告警（纯函数）：访问时间在 18:00-次日 8:00 → 异常。
 *
 * @param logs 访问日志列表
 * @returns 非工作时间访问日志列表
 */
export function detectAfterHoursAccessV13(logs: DataAccessLogV13[]): DataAccessLogV13[] {
  return logs.filter((l) => l.accessHour >= 18 || l.accessHour < 8);
}

/**
 * 越权访问告警（纯函数）：访问超出权限范围 → 异常。
 *
 * @param logs 访问日志列表
 * @returns 越权访问日志列表
 */
export function detectOverAccessV13(logs: DataAccessLogV13[]): DataAccessLogV13[] {
  return logs.filter((l) => !l.hasPermission);
}

/**
 * 批量导出告警（纯函数）：单次导出记录数 > 阈值 → 异常。
 *
 * @param logs 访问日志列表
 * @param threshold 导出记录数阈值
 * @returns 批量导出日志列表
 */
export function detectBulkExportV13(logs: DataAccessLogV13[], threshold: number): DataAccessLogV13[] {
  return logs.filter((l) => l.exportRecordCount > threshold);
}

/**
 * 健澜科技 jlmedaios - 安全事件统计 V13 纯函数（M379-A，stats 避让）
 *
 * computeSecurityIncidentCountV13 / computeAvgResponseTimeHoursV13 / computeIncidentResolutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安全事件统计记录 */
export interface SecurityIncidentRecordV13 {
  incidentCount: number;
  responseHours: number;
  resolvedCount: number;
}

/**
 * 安全事件数（纯函数）：求和。
 *
 * @param records 安全事件统计记录列表
 * @returns 安全事件数
 */
export function computeSecurityIncidentCountV13(records: SecurityIncidentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.incidentCount, 0);
}

/**
 * 事件平均响应时长（纯函数）：总响应小时数/事件数，保留 2 位小数。
 *
 * @param records 安全事件统计记录列表
 * @returns 事件平均响应时长（小时）
 */
export function computeAvgResponseTimeHoursV13(records: SecurityIncidentRecordV13[]): number {
  const incident = records.reduce((acc, r) => acc + r.incidentCount, 0);
  if (incident === 0) return 0;
  const hours = records.reduce((acc, r) => acc + r.responseHours, 0);
  return Math.round((hours / incident) * 100) / 100;
}

/**
 * 事件处置完成率（纯函数）：已处置数/事件总数×100，保留 2 位小数。
 *
 * @param records 安全事件统计记录列表
 * @returns 事件处置完成率百分比
 */
export function computeIncidentResolutionRateV13(records: SecurityIncidentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.incidentCount, 0);
  if (total === 0) return 0;
  const resolved = records.reduce((acc, r) => acc + r.resolvedCount, 0);
  return Math.round((resolved / total) * 10000) / 100;
}

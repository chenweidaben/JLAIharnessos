/**
 * 健澜科技 jlmedaios - 信息安全事件 V13 纯函数（M344-B）
 *
 * computeTotalIncidentCountV13 / computeSevereIncidentCountV13 / computeAvgResponseMinutesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 信息安全事件记录 */
export interface SecurityIncidentRecordV13 {
  severity: "severe" | "moderate" | "low";
  responseMinutes: number;
}

/**
 * 本月事件数（纯函数）：记录总数。
 *
 * @param records 信息安全事件记录列表
 * @returns 本月事件数
 */
export function computeTotalIncidentCountV13(records: SecurityIncidentRecordV13[]): number {
  return records.length;
}

/**
 * 严重事件数（纯函数）：severity=severe 的记录数。
 *
 * @param records 信息安全事件记录列表
 * @returns 严重事件数
 */
export function computeSevereIncidentCountV13(records: SecurityIncidentRecordV13[]): number {
  return records.filter((r) => r.severity === "severe").length;
}

/**
 * 平均响应时长（纯函数）：分钟，均值，保留 1 位小数。
 *
 * @param records 信息安全事件记录列表
 * @returns 平均响应时长（分钟）
 */
export function computeAvgResponseMinutesV13(records: SecurityIncidentRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.responseMinutes, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

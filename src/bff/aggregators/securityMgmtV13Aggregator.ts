/**
 * 健澜科技 jlmedaios - 治安保卫 V13 纯函数（M408-D，M408 收官）
 *
 * computeSecurityPatrolArrivalRateV13 / computeSurveillanceCoverageRateV13 / computeEmergencyResponseTimeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 治安保卫记录 */
export interface SecurityMgmtRecordV13 {
  arrived: number;
  should: number;
  covered: number;
  shouldCover: number;
  responseMinutes: number;
}

/**
 * 安保巡逻到位率（纯函数）：到位次数/应巡逻总次数×100，保留 2 位小数。
 *
 * @param records 治安保卫记录列表
 * @returns 安保巡逻到位率百分比
 */
export function computeSecurityPatrolArrivalRateV13(records: SecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.should, 0);
  if (total === 0) return 0;
  const arrived = records.reduce((acc, r) => acc + r.arrived, 0);
  return Math.round((arrived / total) * 10000) / 100;
}

/**
 * 监控覆盖率（纯函数）：已覆盖监控点/应覆盖监控点总数×100，保留 2 位小数。
 *
 * @param records 治安保卫记录列表
 * @returns 监控覆盖率百分比
 */
export function computeSurveillanceCoverageRateV13(records: SecurityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldCover, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.covered, 0);
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 突发事件响应时长（纯函数）：平均值，单位分钟，Math.ceil 向上取整到整分钟。
 *
 * @param records 治安保卫记录列表
 * @returns 突发事件响应时长（整分钟）
 */
export function computeEmergencyResponseTimeV13(records: SecurityMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.responseMinutes, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}

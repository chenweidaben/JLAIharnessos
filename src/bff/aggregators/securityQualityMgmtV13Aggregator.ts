/**
 * 健澜科技 jlmedaios - 治安保卫质量管理 V13 纯函数（M431-D，M431 收官，-quality 后缀避让旧版 securityMgmtV13（M408））
 *
 * computeSecurityIncidentCountV13 / computeSecurityPatrolArrivalRateV13 / computeSecuritySurveillanceCompletenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 治安保卫质量管理记录 */
export interface SecurityQualityMgmtRecordV13 {
  incidentCount: number;
  patrolArrived: number;
  patrolTotal: number;
  surveillanceIntact: number;
  surveillanceTotal: number;
}

/**
 * 治安事件数（纯函数，整数求和类，单位次，反向指标，值越低越好）：对 incidentCount 求和。
 *
 * @param records 治安保卫质量管理记录列表
 * @returns 治安事件数（整数次）
 */
export function computeSecurityIncidentCountV13(records: SecurityQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.incidentCount, 0);
}

/**
 * 安保巡逻到位率（纯函数）：到位巡逻次数/应巡逻次数×100，保留 2 位小数。
 *
 * @param records 治安保卫质量管理记录列表
 * @returns 安保巡逻到位率百分比
 */
export function computeSecurityPatrolArrivalRateV13(records: SecurityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.patrolTotal, 0);
  if (total === 0) return 0;
  const arrived = records.reduce((acc, r) => acc + r.patrolArrived, 0);
  return Math.round((arrived / total) * 10000) / 100;
}

/**
 * 监控设备完好率（纯函数）：完好监控设备数/监控设备总数×100，保留 2 位小数。
 *
 * @param records 治安保卫质量管理记录列表
 * @returns 监控设备完好率百分比
 */
export function computeSecuritySurveillanceCompletenessRateV13(records: SecurityQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveillanceTotal, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.surveillanceIntact, 0);
  return Math.round((intact / total) * 10000) / 100;
}

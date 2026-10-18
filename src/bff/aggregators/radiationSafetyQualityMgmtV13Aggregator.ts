/**
 * 健澜科技 jlmedaios - 辐射安全质量管理 V13 纯函数（M436-B，院感安全环保质量管理深化组）
 *
 * computeRadiationIncidentCountV13 / computeRadiationMonitoringQualifiedRateV13 / computeRadiationProtectionCompletenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 辐射安全质量管理记录 */
export interface RadiationSafetyQualityMgmtRecordV13 {
  incidentCount: number;
  qualifiedMonitoring: number;
  totalMonitoring: number;
  intactProtection: number;
  totalProtection: number;
}

/**
 * 辐射事件数（纯函数，整数求和类，单位次，反向指标，越低越好）：对 incidentCount 求和。
 *
 * @param records 辐射安全质量管理记录列表
 * @returns 辐射事件数（整数次）
 */
export function computeRadiationIncidentCountV13(records: RadiationSafetyQualityMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.incidentCount, 0);
}

/**
 * 辐射监测合格率（纯函数）：合格监测次数/监测总次数×100，保留 2 位小数。
 *
 * @param records 辐射安全质量管理记录列表
 * @returns 辐射监测合格率百分比
 */
export function computeRadiationMonitoringQualifiedRateV13(records: RadiationSafetyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMonitoring, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedMonitoring, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 辐射防护完好率（纯函数）：完好防护设备数/防护设备总数×100，保留 2 位小数。
 *
 * @param records 辐射安全质量管理记录列表
 * @returns 辐射防护完好率百分比
 */
export function computeRadiationProtectionCompletenessRateV13(records: RadiationSafetyQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalProtection, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.intactProtection, 0);
  return Math.round((intact / total) * 10000) / 100;
}

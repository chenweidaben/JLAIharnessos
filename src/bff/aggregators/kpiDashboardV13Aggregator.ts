/**
 * 健澜科技 jlmedaios - KPI 总览看板 V13 纯函数（M354-A）
 *
 * computeOutpatientEmergencyVisitsV13 / computeDischargedPatientsV13 / computeSurgeryCountV13 / computeAvgLOSV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** KPI 总览看板记录 */
export interface KpiDashboardRecordV13 {
  outpatientEmergencyVisits: number;
  dischargedPatients: number;
  surgeryCount: number;
  avgLOS: number;
}

/**
 * 门急诊人次（纯函数）：求和。
 *
 * @param records KPI 总览看板记录列表
 * @returns 门急诊人次
 */
export function computeOutpatientEmergencyVisitsV13(records: KpiDashboardRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outpatientEmergencyVisits, 0);
}

/**
 * 出院人次（纯函数）：求和。
 *
 * @param records KPI 总览看板记录列表
 * @returns 出院人次
 */
export function computeDischargedPatientsV13(records: KpiDashboardRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.dischargedPatients, 0);
}

/**
 * 手术人次（纯函数）：求和。
 *
 * @param records KPI 总览看板记录列表
 * @returns 手术人次
 */
export function computeSurgeryCountV13(records: KpiDashboardRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.surgeryCount, 0);
}

/**
 * 平均住院日（纯函数）：均值，保留 1 位小数。
 *
 * @param records KPI 总览看板记录列表
 * @returns 平均住院日
 */
export function computeAvgLOSV13(records: KpiDashboardRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.avgLOS, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 健澜科技 jlmedaios - 急诊分级 V13 纯函数（M390-D，M390 收官）
 *
 * computeEmergencyVisitCountV13 / computeRescueSuccessRateV13 / computeEmergencyObservationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊分级记录 */
export interface EmergencySeverityRecordV13 {
  visitCount: number;
  successCount: number;
  rescueTotalCount: number;
  observationCount: number;
}

/**
 * 急诊就诊总数（纯函数）：求和。
 *
 * @param records 急诊分级记录列表
 * @returns 急诊就诊总数
 */
export function computeEmergencyVisitCountV13(records: EmergencySeverityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.visitCount, 0);
}

/**
 * 抢救成功率（纯函数）：成功抢救数/抢救总数×100，保留 2 位小数。
 *
 * @param records 急诊分级记录列表
 * @returns 抢救成功率百分比
 */
export function computeRescueSuccessRateV13(records: EmergencySeverityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.rescueTotalCount, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.successCount, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * 急诊留观人数（纯函数）：求和。
 *
 * @param records 急诊分级记录列表
 * @returns 急诊留观人数
 */
export function computeEmergencyObservationCountV13(records: EmergencySeverityRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.observationCount, 0);
}

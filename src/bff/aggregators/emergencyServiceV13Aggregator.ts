/**
 * 健澜科技 jlmedaios - 急诊服务 V13 纯函数（M372-B）
 *
 * computeEmergencyCountV13 / computeEmergencyObservationRateV13 / computeEmergencyRescueSuccessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊服务记录 */
export interface EmergencyServiceRecordV13 {
  emergencyCount: number;
  observationCount: number;
  rescueCount: number;
  rescueSuccessCount: number;
}

/**
 * 急诊人次（纯函数）：求和。
 *
 * @param records 急诊服务记录列表
 * @returns 急诊人次
 */
export function computeEmergencyCountV13(records: EmergencyServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.emergencyCount, 0);
}

/**
 * 急诊留观率（纯函数）：留观人数/急诊总人数×100，保留 2 位小数。
 *
 * @param records 急诊服务记录列表
 * @returns 急诊留观率百分比
 */
export function computeEmergencyObservationRateV13(records: EmergencyServiceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.emergencyCount, 0);
  if (total === 0) return 0;
  const observation = records.reduce((acc, r) => acc + r.observationCount, 0);
  return Math.round((observation / total) * 10000) / 100;
}

/**
 * 急诊抢救成功率（纯函数）：成功数/抢救数×100，保留 2 位小数。
 *
 * @param records 急诊服务记录列表
 * @returns 急诊抢救成功率百分比
 */
export function computeEmergencyRescueSuccessRateV13(records: EmergencyServiceRecordV13[]): number {
  const rescue = records.reduce((acc, r) => acc + r.rescueCount, 0);
  if (rescue === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.rescueSuccessCount, 0);
  return Math.round((success / rescue) * 10000) / 100;
}

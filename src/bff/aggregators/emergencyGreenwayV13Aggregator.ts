/**
 * 健澜科技 jlmedaios - 急诊绿色通道 V13 纯函数（M348-A）
 *
 * computeGreenwayPatientCountV13 / computeAvgStayMinutesV13 / computeRescueSuccessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 急诊绿色通道记录 */
export interface EmergencyGreenwayRecordV13 {
  greenwayCount: number;
  stayMinutes: number;
  rescueSuccessCount: number;
  rescueTotalCount: number;
}

/**
 * 绿色通道人数（纯函数）：求和。
 *
 * @param records 急诊绿色通道记录列表
 * @returns 绿色通道人数
 */
export function computeGreenwayPatientCountV13(records: EmergencyGreenwayRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.greenwayCount, 0);
}

/**
 * 平均滞留时间（纯函数）：均值，保留 1 位小数。
 *
 * @param records 急诊绿色通道记录列表
 * @returns 平均滞留时间（分钟）
 */
export function computeAvgStayMinutesV13(records: EmergencyGreenwayRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.stayMinutes, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 抢救成功率（纯函数）：成功数/抢救数×100，保留 2 位小数。
 *
 * @param records 急诊绿色通道记录列表
 * @returns 抢救成功率百分比
 */
export function computeRescueSuccessRateV13(records: EmergencyGreenwayRecordV13[]): number {
  const success = records.reduce((acc, r) => acc + r.rescueSuccessCount, 0);
  const total = records.reduce((acc, r) => acc + r.rescueTotalCount, 0);
  if (total === 0) return 0;
  return Math.round((success / total) * 10000) / 100;
}

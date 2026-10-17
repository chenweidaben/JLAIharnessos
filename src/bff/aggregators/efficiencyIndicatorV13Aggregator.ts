/**
 * 健澜科技 jlmedaios - 效率指标 V13 纯函数（M396-D，M396 收官）
 *
 * computeAverageLOSReductionRateV13 / computePreopWaitingTimeAvgV13 / computeBedWorkdayUtilizationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 效率指标记录 */
export interface EfficiencyIndicatorRecordV13 {
  lastLOS: number;
  currentLOS: number;
  preopWaitDays: number;
  surgeryCount: number;
  occupiedBedDays: number;
  calendarDays: number;
}

/**
 * 平均住院日缩短率（纯函数）：(上期平均住院日-本期平均住院日)/上期平均住院日×100，保留 2 位小数。
 *
 * @param records 效率指标记录列表
 * @returns 平均住院日缩短率百分比
 */
export function computeAverageLOSReductionRateV13(records: EfficiencyIndicatorRecordV13[]): number {
  if (records.length === 0) return 0;
  const avgLast = records.reduce((acc, r) => acc + r.lastLOS, 0) / records.length;
  if (avgLast === 0) return 0;
  const avgCurrent = records.reduce((acc, r) => acc + r.currentLOS, 0) / records.length;
  return Math.round(((avgLast - avgCurrent) / avgLast) * 10000) / 100;
}

/**
 * 术前等待时间（纯函数）：总术前等待时长/手术总数，保留 2 位小数，天。
 *
 * @param records 效率指标记录列表
 * @returns 术前等待时间（天）
 */
export function computePreopWaitingTimeAvgV13(records: EfficiencyIndicatorRecordV13[]): number {
  const totalSurgeries = records.reduce((acc, r) => acc + r.surgeryCount, 0);
  if (totalSurgeries === 0) return 0;
  const totalWaitDays = records.reduce((acc, r) => acc + r.preopWaitDays, 0);
  return Math.round((totalWaitDays / totalSurgeries) * 100) / 100;
}

/**
 * 床位工作日利用率（纯函数）：实际占用床日数/日历日数×100，保留 2 位小数。
 *
 * @param records 效率指标记录列表
 * @returns 床位工作日利用率百分比
 */
export function computeBedWorkdayUtilizationRateV13(records: EfficiencyIndicatorRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.calendarDays, 0);
  if (total === 0) return 0;
  const occupied = records.reduce((acc, r) => acc + r.occupiedBedDays, 0);
  return Math.round((occupied / total) * 10000) / 100;
}

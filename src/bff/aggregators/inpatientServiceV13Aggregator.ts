/**
 * 健澜科技 jlmedaios - 住院服务 V13 纯函数（M373-A）
 *
 * computeInpatientCountV13 / computeDischargeCountV13 / computeAverageLodgingDaysV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住院服务记录 */
export interface InpatientServiceRecordV13 {
  inpatientCount: number;
  dischargeCount: number;
  averageLodgingDays: number;
}

/**
 * 住院人次（纯函数）：求和。
 *
 * @param records 住院服务记录列表
 * @returns 住院人次
 */
export function computeInpatientCountV13(records: InpatientServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.inpatientCount, 0);
}

/**
 * 出院人次（纯函数）：求和。
 *
 * @param records 住院服务记录列表
 * @returns 出院人次
 */
export function computeDischargeCountV13(records: InpatientServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.dischargeCount, 0);
}

/**
 * 平均住院日（纯函数）：均值，保留 2 位小数。
 *
 * @param records 住院服务记录列表
 * @returns 平均住院日（天）
 */
export function computeAverageLodgingDaysV13(records: InpatientServiceRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.averageLodgingDays, 0);
  return Math.round((total / records.length) * 100) / 100;
}

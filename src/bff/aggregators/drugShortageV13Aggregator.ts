/**
 * 健澜科技 jlmedaios - 药品短缺 V13 纯函数（M336-A）
 *
 * computeShortageCountV13 / computeAvgShortageDaysV13 / computeAffectedPatientsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品短缺记录 */
export interface DrugShortageRecordV13 {
  shortageDays: number;
  affectedPatients: number;
}

/**
 * 本月短缺品种数（纯函数）：记录数。
 *
 * @param records 药品短缺记录列表
 * @returns 短缺品种数
 */
export function computeShortageCountV13(records: DrugShortageRecordV13[]): number {
  return records.length;
}

/**
 * 平均缺货天数（纯函数）：均值，保留 1 位小数。
 *
 * @param records 药品短缺记录列表
 * @returns 平均缺货天数
 */
export function computeAvgShortageDaysV13(records: DrugShortageRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.shortageDays, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 短缺影响人次（纯函数）：求和。
 *
 * @param records 药品短缺记录列表
 * @returns 影响人次
 */
export function computeAffectedPatientsV13(records: DrugShortageRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.affectedPatients, 0);
}

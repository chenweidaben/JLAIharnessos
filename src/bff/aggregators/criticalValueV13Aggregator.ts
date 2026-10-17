/**
 * 健澜科技 jlmedaios - 危急值 V13 纯函数（M335-C）
 *
 * computeCriticalValueCountV13 / computeTimelyHandlingRateV13 / computeMissedReportRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 危急值记录 */
export interface CriticalValueRecordV13 {
  totalCount: number;
  timelyHandledCount: number;
  missedReportCount: number;
}

/**
 * 本月危急值通报数（纯函数）：总数。
 *
 * @param records 危急值记录列表
 * @returns 通报数
 */
export function computeCriticalValueCountV13(records: CriticalValueRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.totalCount, 0);
}

/**
 * 及时处理率（纯函数）：及时数/总数×100。
 *
 * @param records 危急值记录列表
 * @returns 及时处理率百分比
 */
export function computeTimelyHandlingRateV13(records: CriticalValueRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  const timely = records.reduce((acc, r) => acc + r.timelyHandledCount, 0);
  if (total === 0) return 0;
  return Math.round((timely / total) * 100);
}

/**
 * 漏报率（纯函数）：漏报数/总数×100。
 *
 * @param records 危急值记录列表
 * @returns 漏报率百分比
 */
export function computeMissedReportRateV13(records: CriticalValueRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  const missed = records.reduce((acc, r) => acc + r.missedReportCount, 0);
  if (total === 0) return 0;
  return Math.round((missed / total) * 100);
}

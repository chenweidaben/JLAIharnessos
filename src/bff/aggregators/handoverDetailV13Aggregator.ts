/**
 * 健澜科技 jlmedaios - 交接班管理（细节）V13 纯函数（M413-C，detail 避让旧版 handoverMgmtV13）
 *
 * computeHandoverWritingCompletenessRateV13 / computeBedsideHandoverExecutionRateV13 / computeHandoverMissedItemRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 交接班管理（细节）记录 */
export interface HandoverDetailRecordV13 {
  complete: number;
  total: number;
  executed: number;
  shouldTotal: number;
  missed: number;
  handoverTotal: number;
}

/**
 * 交接班书写完整率（纯函数）：完整书写数/交接班总数×100，保留 2 位小数。
 *
 * @param records 交接班管理（细节）记录列表
 * @returns 交接班书写完整率百分比
 */
export function computeHandoverWritingCompletenessRateV13(records: HandoverDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 床旁交接执行率（纯函数）：执行床旁交接次数/应执行总数×100，保留 2 位小数。
 *
 * @param records 交接班管理（细节）记录列表
 * @returns 床旁交接执行率百分比
 */
export function computeBedsideHandoverExecutionRateV13(records: HandoverDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTotal, 0);
  if (total === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executed, 0);
  return Math.round((executed / total) * 10000) / 100;
}

/**
 * 交接漏项率（纯函数，反向指标，值越低越好）：漏项交接次数/交接总次数×100，保留 2 位小数。
 *
 * @param records 交接班管理（细节）记录列表
 * @returns 交接漏项率百分比
 */
export function computeHandoverMissedItemRateV13(records: HandoverDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.handoverTotal, 0);
  if (total === 0) return 0;
  const missed = records.reduce((acc, r) => acc + r.missed, 0);
  return Math.round((missed / total) * 10000) / 100;
}

/**
 * 健澜科技 jlmedaios - 投诉处理管理 V13 纯函数（M451-B，医患关系与投诉管理组）
 *
 * computeComplaintHandlingAcceptanceTimelinessRateV13 / computeComplaintHandlingClosureRateV13 / computeComplaintHandlingSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 投诉处理管理记录 */
export interface ComplaintHandlingMgmtRecordV13 {
  timelyAccept: number;
  totalComplaint: number;
  closed: number;
  satisfied: number;
  totalClosed: number;
}

/**
 * 投诉受理及时率（纯函数）：及时受理投诉数/投诉总数×100，保留 2 位小数。
 *
 * @param records 投诉处理管理记录列表
 * @returns 投诉受理及时率百分比
 */
export function computeComplaintHandlingAcceptanceTimelinessRateV13(records: ComplaintHandlingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalComplaint, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyAccept, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 投诉办结率（纯函数）：已办结投诉数/投诉总数×100，保留 2 位小数。
 *
 * @param records 投诉处理管理记录列表
 * @returns 投诉办结率百分比
 */
export function computeComplaintHandlingClosureRateV13(records: ComplaintHandlingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalComplaint, 0);
  if (total === 0) return 0;
  const closed = records.reduce((acc, r) => acc + r.closed, 0);
  return Math.round((closed / total) * 10000) / 100;
}

/**
 * 投诉满意率（纯函数）：满意投诉数/已办结投诉总数×100，保留 2 位小数。
 *
 * @param records 投诉处理管理记录列表
 * @returns 投诉满意率百分比
 */
export function computeComplaintHandlingSatisfactionRateV13(records: ComplaintHandlingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalClosed, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

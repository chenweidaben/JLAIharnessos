/**
 * 健澜科技 jlmedaios - 投诉处理 V13 纯函数（M340-A）
 *
 * computeComplaintCountV13 / computeClosureRateV13 / computeAvgHandleDaysV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 投诉处理记录 */
export interface ComplaintRecordV13 {
  complaintCount: number;
  closedCount: number;
  handleDays: number;
}

/**
 * 本月投诉数（纯函数）：求和。
 *
 * @param records 投诉处理记录列表
 * @returns 投诉数
 */
export function computeComplaintCountV13(records: ComplaintRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.complaintCount, 0);
}

/**
 * 办结率（纯函数）：已办结数/总投诉数×100，保留 1 位小数。
 *
 * @param records 投诉处理记录列表
 * @returns 办结率百分比
 */
export function computeClosureRateV13(records: ComplaintRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.complaintCount, 0);
  const closed = records.reduce((acc, r) => acc + r.closedCount, 0);
  if (total === 0) return 0;
  return Math.round((closed / total) * 1000) / 10;
}

/**
 * 平均处理天数（纯函数）：均值，保留 1 位小数。
 *
 * @param records 投诉处理记录列表
 * @returns 平均处理天数
 */
export function computeAvgHandleDaysV13(records: ComplaintRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.handleDays, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

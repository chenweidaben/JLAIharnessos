/**
 * 健澜科技 jlmedaios - 病历缺陷反馈与整改闭环 V14 聚合器（M464-D，M464 收官）
 *
 * 纯函数：构造整改反馈记录 + 按状态统计闭环情况。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 整改反馈状态 */
export type FeedbackStatusV14 = "open" | "resolving" | "closed";

/** 缺陷输入 */
export interface DefectInputV14 {
  defectId: string;
  noteId: string;
  writer: string;
  feedback: string;
}

/** 整改反馈记录 */
export interface FeedbackRecordV14 {
  feedbackId: string;
  defectId: string;
  noteId: string;
  writer: string;
  feedback: string;
  status: FeedbackStatusV14;
  createdAt: string;
}

/** 闭环统计结果 */
export interface RemediationStatsV14 {
  open: number;
  resolving: number;
  closed: number;
  total: number;
}

/**
 * 构造整改反馈记录（status 初始化为 'open'）。
 *
 * @param defect 缺陷输入
 * @returns 反馈记录
 */
export function buildFeedback(defect: DefectInputV14): FeedbackRecordV14 {
  return {
    feedbackId: `FB-${defect.defectId}`,
    defectId: defect.defectId,
    noteId: defect.noteId,
    writer: defect.writer,
    feedback: defect.feedback,
    status: "open",
    createdAt: new Date().toISOString(),
  };
}

/**
 * 按状态统计缺陷整改闭环情况。
 *
 * @param records 反馈记录列表
 * @returns { open, resolving, closed, total }
 */
export function trackRemediationStatus(records: FeedbackRecordV14[]): RemediationStatsV14 {
  const result: RemediationStatsV14 = { open: 0, resolving: 0, closed: 0, total: records.length };
  for (const record of records) {
    if (record.status === "open") result.open += 1;
    else if (record.status === "resolving") result.resolving += 1;
    else if (record.status === "closed") result.closed += 1;
  }
  return result;
}

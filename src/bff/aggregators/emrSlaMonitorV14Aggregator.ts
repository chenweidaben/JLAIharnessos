/**
 * 健澜科技 jlmedaios - 病历书写时限 SLA 实时监控 V14 聚合器（M461-A）
 *
 * 纯函数：单条 SLA 状态判定 + 批量聚合红绿灯。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** SLA 记录 */
export interface SlaRecordV14 {
  recordId: string;
  recordType: string;
  patientName: string;
  dueAt: string;
}

/** SLA 状态 */
export type SlaStatusV14 = "on_time" | "warning" | "overdue";

/**
 * 单条 SLA 状态判定。
 *
 * @param dueAt 应完成时间（ISO）
 * @param now 当前时间（ISO）
 * @param warnMinutesBefore 提前多少分钟进入预警（默认 60）
 * @returns on_time / warning / overdue
 */
export function computeSlaStatus(
  dueAt: string,
  now: string,
  warnMinutesBefore = 60,
): SlaStatusV14 {
  const dueMs = new Date(dueAt).getTime();
  const nowMs = new Date(now).getTime();
  if (Number.isNaN(dueMs) || Number.isNaN(nowMs)) return "on_time";
  if (nowMs > dueMs) return "overdue";
  const warnMs = warnMinutesBefore * 60 * 1000;
  if (nowMs > dueMs - warnMs) return "warning";
  return "on_time";
}

/** 聚合后单项 */
export interface SlaItemV14 extends SlaRecordV14 {
  status: SlaStatusV14;
}

/**
 * 批量聚合 SLA 列表。
 *
 * @param records SLA 记录数组
 * @param now 当前时间（ISO）
 * @returns onTime / warning / overdue 计数 + 带状态的列表
 */
export function aggregateSlaList(
  records: SlaRecordV14[],
  now: string,
): { onTime: number; warning: number; overdue: number; items: SlaItemV14[] } {
  const items: SlaItemV14[] = records.map((r) => ({ ...r, status: computeSlaStatus(r.dueAt, now) }));
  const onTime = items.filter((i) => i.status === "on_time").length;
  const warning = items.filter((i) => i.status === "warning").length;
  const overdue = items.filter((i) => i.status === "overdue").length;
  return { onTime, warning, overdue, items };
}

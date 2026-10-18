/**
 * 健澜科技 jlmedaios - 质控任务退回 V14 聚合器（M488-C）
 *
 * 纯函数：任务退回 + 退回记录构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 退回记录 */
export interface ReturnRecordV14 {
  taskId: string;
  reason: string;
  reviewer: string;
}

/**
 * 退回质控任务。
 *
 * @param taskId 任务号
 * @param reason 退回原因
 * @returns 退回结果
 */
export function returnQcTask(taskId: string, reason: string): { taskId: string; status: string; reason: string } {
  return {
    taskId,
    status: "已退回",
    reason,
  };
}

/**
 * 构建退回记录。
 *
 * @param taskId 任务号
 * @param reason 退回原因
 * @param reviewer 质控员
 * @returns 退回记录
 */
export function buildReturnRecord(taskId: string, reason: string, reviewer: string): ReturnRecordV14 {
  return { taskId, reason, reviewer };
}

/**
 * 健澜科技 jlmedaios - 质控任务签收 V14 聚合器（M488-B）
 *
 * 纯函数：任务签收 + 签收记录构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 签收记录 */
export interface ReceiveRecordV14 {
  taskId: string;
  reviewer: string;
}

/**
 * 签收质控任务。
 *
 * @param taskId 任务号
 * @returns 签收结果
 */
export function receiveQcTask(taskId: string): { taskId: string; status: string; receivedAt: string } {
  return {
    taskId,
    status: "已签收",
    receivedAt: new Date().toISOString(),
  };
}

/**
 * 构建签收记录。
 *
 * @param taskId 任务号
 * @param reviewer 质控员
 * @returns 签收记录
 */
export function buildReceiveRecord(taskId: string, reviewer: string): ReceiveRecordV14 {
  return { taskId, reviewer };
}

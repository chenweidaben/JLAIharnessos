/**
 * 健澜科技 jlmedaios - 质控任务派发 V14 聚合器（M488-A）
 *
 * 纯函数：任务派发构建 + 任务分配。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 派发任务 */
export interface DispatchTaskV14 {
  recordId: string;
  reviewer: string;
}

/**
 * 构建派发任务。
 *
 * @param recordId 病历号
 * @param reviewer 质控员
 * @returns 派发任务
 */
export function buildDispatchTask(recordId: string, reviewer: string): DispatchTaskV14 {
  return { recordId, reviewer };
}

/**
 * 分配质控任务。
 *
 * @param recordId 病历号
 * @param reviewer 质控员
 * @returns 分配结果
 */
export function assignQcTask(recordId: string, reviewer: string): { recordId: string; reviewer: string; status: string; assignedAt: string } {
  return {
    recordId,
    reviewer,
    status: "已派发",
    assignedAt: new Date().toISOString(),
  };
}

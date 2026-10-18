/**
 * 健澜科技 jlmedaios - 质控任务归档 V14 聚合器（M488-D，M488 收官）
 *
 * 纯函数：任务归档 + 归档记录构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档记录 */
export interface ArchiveRecordV14 {
  taskId: string;
  reviewer: string;
  result: string;
}

/**
 * 归档质控任务。
 *
 * @param taskId 任务号
 * @returns 归档结果
 */
export function archiveQcTask(taskId: string): { taskId: string; status: string; archivedAt: string } {
  return {
    taskId,
    status: "已归档",
    archivedAt: new Date().toISOString(),
  };
}

/**
 * 构建归档记录。
 *
 * @param taskId 任务号
 * @param reviewer 质控员
 * @param result 质控结果
 * @returns 归档记录
 */
export function buildArchiveRecord(taskId: string, reviewer: string, result: string): ArchiveRecordV14 {
  return { taskId, reviewer, result };
}

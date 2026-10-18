/**
 * 健澜科技 jlmedaios - 科室质控员工作台 V14 聚合器（M463-D，M463 收官）
 *
 * 纯函数：按状态统计队列 + 按优先级分组 + 挑出逾期任务。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控任务 */
export interface QcTaskV14 {
  id: string;
  title: string;
  dept: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "processing" | "resolved";
  dueAt: string;
}

/** 队列统计结果 */
export interface QcQueueStatsV14 {
  pending: number;
  processing: number;
  resolved: number;
}

/** 优先级分组 */
export interface PriorityGroupV14 {
  high: number;
  medium: number;
  low: number;
}

/** 分类结果 */
export interface QcTaskCategorizationV14 {
  byPriority: PriorityGroupV14;
  overdue: QcTaskV14[];
}

/**
 * 按状态统计待审/处理中/已处理数量。
 *
 * @param tasks 质控任务列表
 * @returns { pending, processing, resolved }
 */
export function buildQcQueue(tasks: QcTaskV14[]): QcQueueStatsV14 {
  const result: QcQueueStatsV14 = { pending: 0, processing: 0, resolved: 0 };
  for (const task of tasks) {
    if (task.status === "pending") result.pending += 1;
    else if (task.status === "processing") result.processing += 1;
    else if (task.status === "resolved") result.resolved += 1;
  }
  return result;
}

/**
 * 按优先级分组 + 挑出已逾期任务（dueAt < now 且 status != 'resolved'）。
 *
 * @param tasks 质控任务列表
 * @param now 当前时间（ISO）
 * @returns byPriority + overdue
 */
export function categorizeQcTasks(tasks: QcTaskV14[], now: string): QcTaskCategorizationV14 {
  const byPriority: PriorityGroupV14 = { high: 0, medium: 0, low: 0 };
  const overdue: QcTaskV14[] = [];
  const nowMs = new Date(now).getTime();
  for (const task of tasks) {
    if (task.priority === "high") byPriority.high += 1;
    else if (task.priority === "medium") byPriority.medium += 1;
    else if (task.priority === "low") byPriority.low += 1;
    const dueMs = new Date(task.dueAt).getTime();
    if (!Number.isNaN(dueMs) && dueMs < nowMs && task.status !== "resolved") {
      overdue.push(task);
    }
  }
  return { byPriority, overdue };
}

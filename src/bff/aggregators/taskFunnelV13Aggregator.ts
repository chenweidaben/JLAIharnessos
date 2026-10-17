/**
 * 健澜科技 jlmedaios - 任务进度追踪与升级 V13 纯函数（M307-B）
 *
 * checkTaskOverdueV13 / escalateTaskV13 / buildTaskFunnelV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 任务 */
export interface FlywheelTaskV13 {
  taskId: string;
  title: string;
  owner: string;
  deadline: string;
  expectedGain: number;
  status: "open" | "in_progress" | "done" | "escalated";
  completedSubItems: number;
  totalSubItems: number;
}

/** 任务漏斗 */
export interface TaskFunnelV13 {
  open: number;
  inProgress: number;
  done: number;
  escalated: number;
}

/**
 * 逾期检测（纯函数）：today > deadline → overdue=true。
 *
 * @param task 任务
 * @param today 今天（ISO YYYY-MM-DD）
 * @returns 是否逾期
 */
export function checkTaskOverdueV13(task: FlywheelTaskV13, today: string): boolean {
  if (!task.deadline) return false;
  return today > task.deadline;
}

/**
 * 升级（纯函数）：owner 升级为上级，status="escalated"。
 *
 * @param task 任务
 * @returns 升级后任务
 */
export function escalateTaskV13(task: FlywheelTaskV13): FlywheelTaskV13 {
  return { ...task, owner: `${task.owner}（上级）`, status: "escalated" };
}

/**
 * 任务漏斗（纯函数）：四阶段计数。
 *
 * @param tasks 任务列表
 * @returns 漏斗
 */
export function buildTaskFunnelV13(tasks: FlywheelTaskV13[]): TaskFunnelV13 {
  return {
    open: tasks.filter((t) => t.status === "open").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    escalated: tasks.filter((t) => t.status === "escalated").length,
  };
}

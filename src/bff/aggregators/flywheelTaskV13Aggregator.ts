/**
 * 健澜科技 jlmedaios - 飞轮改进任务闭环 V13 纯函数（M307-A）
 *
 * createFlywheelActionTaskV13 / assignTaskV13 / trackTaskProgressV13
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
  status: "open" | "in_progress" | "done";
  completedSubItems: number;
  totalSubItems: number;
}

/**
 * 任务创建（纯函数）：由建议生成任务。
 *
 * @param title 任务标题
 * @param expectedGain 预计提升
 * @param totalSubItems 子项总数
 * @returns 新任务
 */
export function createFlywheelActionTaskV13(
  title: string,
  expectedGain: number,
  totalSubItems: number,
): FlywheelTaskV13 {
  return {
    taskId: `task-${Date.now()}`,
    title,
    owner: "",
    deadline: "",
    expectedGain,
    status: "open",
    completedSubItems: 0,
    totalSubItems,
  };
}

/**
 * 指派 owner（纯函数）：deadline = 今天+14天 ISO。
 *
 * @param task 任务
 * @param owner 负责人
 * @returns 指派后任务
 */
export function assignTaskV13(task: FlywheelTaskV13, owner: string): FlywheelTaskV13 {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return { ...task, owner, deadline: d.toISOString().slice(0, 10) };
}

/**
 * 进度计算（纯函数）：completed/total×100，整数。
 *
 * @param task 任务
 * @returns 进度百分比
 */
export function trackTaskProgressV13(task: FlywheelTaskV13): number {
  if (task.totalSubItems === 0) return 0;
  return Math.round((task.completedSubItems / task.totalSubItems) * 100);
}

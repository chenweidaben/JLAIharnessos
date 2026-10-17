/**
 * 健澜科技 jlmedaios - 科室任务详情与督办 V13 纯函数（M308-B）
 *
 * buildTaskDetailV13 / computeSubItemProgressV13 / nudgeTaskOwnerV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 子项 */
export interface SubItemV13 {
  subItemId: string;
  label: string;
  done: boolean;
}

/** 历史 */
export interface TaskHistoryV13 {
  ts: string;
  action: string;
  actor: string;
}

/** 任务 */
export interface TaskHeaderV13 {
  taskId: string;
  title: string;
  owner: string;
  dept: string;
  status: string;
  nudgeCount: number;
}

/** 任务详情 */
export interface TaskDetailV13 {
  task: TaskHeaderV13;
  subItems: SubItemV13[];
  progress: number;
  history: TaskHistoryV13[];
}

/**
 * 任务详情（纯函数）：基础信息 + 子项进度 + 历史时间线。
 *
 * @param task 任务头
 * @param subItems 子项
 * @param history 历史
 * @returns 详情
 */
export function buildTaskDetailV13(
  task: TaskHeaderV13,
  subItems: SubItemV13[],
  history: TaskHistoryV13[],
): TaskDetailV13 {
  return {
    task,
    subItems,
    progress: computeSubItemProgressV13(subItems),
    history,
  };
}

/**
 * 子项进度（纯函数）：completed/total×100，整数。
 *
 * @param subItems 子项
 * @returns 进度百分比
 */
export function computeSubItemProgressV13(subItems: SubItemV13[]): number {
  if (subItems.length === 0) return 0;
  const completed = subItems.filter((s) => s.done).length;
  return Math.round((completed / subItems.length) * 100);
}

/**
 * 催办（纯函数）：nudgeCount+1，>3 自动升级给上级。
 *
 * @param task 任务
 * @param nudgeCount 当前催办次数
 * @returns 更新后任务
 */
export function nudgeTaskOwnerV13(task: TaskHeaderV13, nudgeCount: number): TaskHeaderV13 {
  const next = nudgeCount + 1;
  const escalated = next > 3;
  return {
    ...task,
    nudgeCount: next,
    status: escalated ? "escalated" : task.status,
    owner: escalated ? `${task.owner}（上级）` : task.owner,
  };
}

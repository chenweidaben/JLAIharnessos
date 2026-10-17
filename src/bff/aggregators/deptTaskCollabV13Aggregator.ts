/**
 * 健澜科技 jlmedaios - 科室间任务协作总览 V13 纯函数（M308-D）
 *
 * aggregateCrossDeptDependenciesV13 / buildCollabRequestQueueV13 / identifyBottleneckDeptV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 跨科任务 */
export interface CrossDeptTaskV13 {
  taskId: string;
  title: string;
  ownerDept: string;
  dependsOnDept: string;
  status: "pending" | "in_progress" | "done";
  waitDays: number;
}

/** 跨科依赖聚合 */
export interface CrossDeptDependencyV13 {
  dept: string;
  waitedByCount: number;
}

/**
 * 跨科依赖聚合（纯函数）：按被依赖科室分组统计等待任务数。
 *
 * @param tasks 跨科任务
 * @returns 聚合结果
 */
export function aggregateCrossDeptDependenciesV13(
  tasks: CrossDeptTaskV13[],
): CrossDeptDependencyV13[] {
  const map = new Map<string, number>();
  for (const t of tasks) {
    map.set(t.dependsOnDept, (map.get(t.dependsOnDept) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([dept, waitedByCount]) => ({ dept, waitedByCount }));
}

/**
 * 协作请求队列（纯函数）：pending 状态，按 waitDays desc。
 *
 * @param tasks 跨科任务
 * @returns 队列
 */
export function buildCollabRequestQueueV13(tasks: CrossDeptTaskV13[]): CrossDeptTaskV13[] {
  return tasks
    .filter((t) => t.status === "pending")
    .sort((a, b) => b.waitDays - a.waitDays);
}

/**
 * 瓶颈科室识别（纯函数）：被依赖次数最多的科室。
 *
 * @param dependencies 聚合结果
 * @returns 瓶颈科室名
 */
export function identifyBottleneckDeptV13(dependencies: CrossDeptDependencyV13[]): string {
  if (dependencies.length === 0) return "";
  const sorted = [...dependencies].sort((a, b) => b.waitedByCount - a.waitedByCount);
  return sorted[0].dept;
}

/**
 * 健澜科技 jlmedaios - 科室任务看板 V13 纯函数（M308-A）
 *
 * buildDeptTaskBoardV13 / rankDeptByOpenV13 / listDeptTasksV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室任务 */
export interface DeptTaskV13 {
  taskId: string;
  title: string;
  dept: string;
  status: "open" | "overdue" | "verifying" | "done";
}

/** 科室看板聚合 */
export interface DeptBoardV13 {
  dept: string;
  open: number;
  overdue: number;
  verifying: number;
  done: number;
  closedRate: number;
}

/**
 * 科室看板（纯函数）：按 dept 聚合四态计数 + 本科闭环率 done/total×100。
 *
 * @param tasks 任务列表
 * @returns 各科室看板
 */
export function buildDeptTaskBoardV13(tasks: DeptTaskV13[]): DeptBoardV13[] {
  const map = new Map<string, { open: number; overdue: number; verifying: number; done: number }>();
  for (const t of tasks) {
    const agg = map.get(t.dept) ?? { open: 0, overdue: 0, verifying: 0, done: 0 };
    agg[t.status] += 1;
    map.set(t.dept, agg);
  }
  return Array.from(map.entries()).map(([dept, agg]) => {
    const total = agg.open + agg.overdue + agg.verifying + agg.done;
    return {
      dept,
      ...agg,
      closedRate: total === 0 ? 0 : Math.round((agg.done / total) * 100),
    };
  });
}

/**
 * 科室排名（纯函数）：按逾期数 desc。
 *
 * @param depts 科室看板
 * @returns 排序后
 */
export function rankDeptByOpenV13(depts: DeptBoardV13[]): DeptBoardV13[] {
  return [...depts].sort((a, b) => b.overdue - a.overdue);
}

/**
 * 科室任务列表（纯函数）：按 dept 过滤，逾期排最前。
 *
 * @param tasks 任务列表
 * @param dept 科室
 * @returns 过滤后任务
 */
export function listDeptTasksV13(tasks: DeptTaskV13[], dept: string): DeptTaskV13[] {
  const order: Record<DeptTaskV13["status"], number> = { overdue: 0, open: 1, verifying: 2, done: 3 };
  return tasks
    .filter((t) => t.dept === dept)
    .sort((a, b) => order[a.status] - order[b.status]);
}

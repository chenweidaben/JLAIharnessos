/**
 * 健澜科技 jlmedaios - 科室经验 SOP 沉淀 V13 纯函数（M308-C）
 *
 * convertTaskToSopV13 / rankSopByUsageV13 / buildDeptSopLibraryV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** SOP */
export interface DeptSopV13 {
  sopId: string;
  title: string;
  dept: string;
  actions: string[];
  scenario: string;
  usageCount: number;
}

/** 已验收任务 */
export interface AcceptedTaskV13 {
  taskId: string;
  title: string;
  dept: string;
  keyActions: string[];
  scenario: string;
}

/**
 * 任务转 SOP（纯函数）：title + 关键动作 + 适用场景。
 *
 * @param task 已验收任务
 * @returns SOP
 */
export function convertTaskToSopV13(task: AcceptedTaskV13): DeptSopV13 {
  return {
    sopId: `sop-${task.taskId}`,
    title: task.title,
    dept: task.dept,
    actions: task.keyActions,
    scenario: task.scenario,
    usageCount: 0,
  };
}

/**
 * 使用率排序（纯函数）：按 usageCount 降序。
 *
 * @param sops SOP 列表
 * @returns 排序后
 */
export function rankSopByUsageV13(sops: DeptSopV13[]): DeptSopV13[] {
  return [...sops].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * 科室 SOP 库（纯函数）：按 dept 过滤。
 *
 * @param dept 科室
 * @param sops SOP 列表
 * @returns 本科室 SOP
 */
export function buildDeptSopLibraryV13(dept: string, sops: DeptSopV13[]): DeptSopV13[] {
  return sops.filter((s) => s.dept === dept);
}

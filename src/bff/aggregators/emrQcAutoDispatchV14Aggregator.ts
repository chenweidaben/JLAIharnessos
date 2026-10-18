/**
 * 健澜科技 jlmedaios - 病历质控自动派单 V14 聚合器（M521-B）
 *
 * 纯函数：构建派单基础数据 + 自动派单 + 构建派单报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 派单基础数据 */
export interface AutoDispatchV14 {
  recordId: string;
  dept: string;
  defectLevel: string;
}

/** 派单人员 */
export interface AssigneeV14 {
  name: string;
  workload: number;
}

/** 派单结果 */
export interface DispatchResultV14 {
  assignedTo: string;
  workload: number;
}

/** 派单报告 */
export interface DispatchReportV14 {
  assignedTo: string;
  workload: number;
}

/**
 * 构建派单基础数据。
 *
 * @param recordId 记录ID
 * @param dept 科室
 * @param defectLevel 缺陷级别
 * @returns 派单基础数据
 */
export function buildAutoDispatch(recordId: string, dept: string, defectLevel: string): AutoDispatchV14 {
  return { recordId, dept, defectLevel };
}

/**
 * 自动派单。
 * 选 assignees 中 workload 最低者，平摊取第一个；派单后 workload+1。
 *
 * @param task 派单基础数据
 * @param assignees 候选派单人员列表
 * @returns 派单结果（assignedTo + workload）
 */
export function dispatchQcTask(task: AutoDispatchV14, assignees: AssigneeV14[]): DispatchResultV14 {
  // 避免未使用变量警告
  void task;
  // 手算检查：选 assignees 中 workload 最低者，平摊取第一个
  let minWorkload = Infinity;
  let selected: AssigneeV14 | null = null;
  for (const a of assignees) {
    if (a.workload < minWorkload) {
      minWorkload = a.workload;
      selected = a;
    }
  }
  // 手算：派单后 workload+1
  const newWorkload = selected ? selected.workload + 1 : 0;
  const assignedTo = selected ? selected.name : "无可用人员";
  return { assignedTo, workload: newWorkload };
}

/**
 * 构建派单报告。
 *
 * @param result 派单结果
 * @returns 派单报告（assignedTo + workload）
 */
export function buildAutoDispatchReport(result: DispatchResultV14): DispatchReportV14 {
  return { assignedTo: result.assignedTo, workload: result.workload };
}

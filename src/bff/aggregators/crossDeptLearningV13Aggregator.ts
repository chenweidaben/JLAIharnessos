/**
 * 健澜科技 jlmedaios - 跨科协作任务经验双沉淀 V13 纯函数（M309-C）
 *
 * dualSedimentExperienceV13 / countDualSedimentV13 / computeCrossDeptLearningScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 跨科学习任务 */
export interface CrossDeptLearningTaskV13 {
  taskId: string;
  title: string;
  deptA: string;
  deptB: string;
  dualSediment: boolean;
}

/** 双沉淀结果 */
export interface DualSedimentV13 {
  taskId: string;
  title: string;
  writtenTo: string[];
  sedimentCount: number;
}

/**
 * 双沉淀（纯函数）：任务闭环后经验同时写入双方科室 MUSE。
 *
 * @param task 任务
 * @param deptA 科室 A
 * @param deptB 科室 B
 * @returns 双沉淀结果
 */
export function dualSedimentExperienceV13(
  task: { taskId: string; title: string },
  deptA: string,
  deptB: string,
): DualSedimentV13 {
  return {
    taskId: task.taskId,
    title: task.title,
    writtenTo: [deptA, deptB],
    sedimentCount: 2,
  };
}

/**
 * 双沉淀计数（纯函数）：多少任务同时沉淀到两个科室。
 *
 * @param tasks 任务列表
 * @returns 双沉淀任务数
 */
export function countDualSedimentV13(tasks: CrossDeptLearningTaskV13[]): number {
  return tasks.filter((t) => t.dualSediment).length;
}

/**
 * 跨科学习分（纯函数）：dualCount/total×100，整数。
 *
 * @param dualCount 双沉淀任务数
 * @param totalTasks 总任务数
 * @returns 学习分
 */
export function computeCrossDeptLearningScoreV13(dualCount: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  return Math.round((dualCount / totalTasks) * 100);
}

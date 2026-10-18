/**
 * 健澜科技 jlmedaios - 质控 PDCA 闭环报告 V14 聚合器（M496-D，M496 收官）
 *
 * 纯函数：PDCA 闭环报告构建 + PDCA 循环聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** PDCA 闭环报告 */
export interface PdcaReportV14 {
  plan: string;
  do: string;
  check: string;
  act: string;
}

/** PDCA 循环聚合结果 */
export interface PdcaCycleAggregateV14 {
  total: number;
  completed: number;
  rate: number;
}

/**
 * 构建 PDCA 闭环报告。
 *
 * @param plan 计划阶段
 * @param doPhase 执行阶段
 * @param check 检查阶段
 * @param act 处理阶段
 * @returns PDCA 闭环报告
 */
export function buildPdcaReport(plan: string, doPhase: string, check: string, act: string): PdcaReportV14 {
  return { plan, do: doPhase, check, act };
}

/**
 * 聚合 PDCA 循环（总阶段+已完成+完成率%）。
 *
 * @param cycles PDCA 阶段数组
 * @returns 聚合结果
 */
export function aggregatePdcaCycle(cycles: { phase: string; completed: boolean }[]): PdcaCycleAggregateV14 {
  const total = cycles.length;
  if (total === 0) {
    return { total: 0, completed: 0, rate: 0 };
  }
  // 手算完成率：rate=Math.ceil(completed/total×100)，分母不能为 0
  const completed = cycles.filter((c) => c.completed).length;
  const rate = Math.ceil((completed / total) * 100);
  return { total, completed, rate };
}

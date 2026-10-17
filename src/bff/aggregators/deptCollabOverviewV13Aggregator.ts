/**
 * 健澜科技 jlmedaios - 科际协作与经验共享总览 V13 纯函数（M308-D）
 *
 * buildDeptCollabOverviewV13 / computeDeptCollabScoreV13 / identifyDeptCollabGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室看板输入 */
export interface DeptBoardInputV13 {
  dept: string;
  closedRate: number;
  overdueCount: number;
}

/** SOP 输入 */
export interface SopInputV13 {
  dept: string;
}

/** 总览输入 */
export interface DeptCollabInputV13 {
  depts: DeptBoardInputV13[];
  sops: SopInputV13[];
}

/** 总览结果 */
export interface DeptCollabOverviewV13 {
  totalDepts: number;
  avgClosedRate: number;
  totalSops: number;
  avgOverduePerDept: number;
}

/**
 * 总览（纯函数）：totalDepts/avgClosedRate/totalSops/avgOverduePerDept。
 *
 * @param input 输入
 * @returns 总览
 */
export function buildDeptCollabOverviewV13(input: DeptCollabInputV13): DeptCollabOverviewV13 {
  const totalDepts = input.depts.length;
  const avgClosedRate = totalDepts === 0
    ? 0
    : Math.round(input.depts.reduce((s, d) => s + d.closedRate, 0) / totalDepts);
  const totalSops = input.sops.length;
  const avgOverduePerDept = totalDepts === 0
    ? 0
    : Math.round((input.depts.reduce((s, d) => s + d.overdueCount, 0) / totalDepts) * 10) / 10;
  return { totalDepts, avgClosedRate, totalSops, avgOverduePerDept };
}

/**
 * 协作分（纯函数）：closedRatio×0.5 + sopRatio×0.3 + (100-overdueRatio)×0.2，0-100。
 * 假设每科室 closedRate 已是 0-100，SOP 上限 10/科室，逾期上限 5/科室。
 *
 * @param overview 总览
 * @returns 协作分
 */
export function computeDeptCollabScoreV13(overview: DeptCollabOverviewV13): number {
  if (overview.totalDepts === 0) return 0;
  const closedRatio = Math.min(100, Math.max(0, overview.avgClosedRate));
  const avgSopsPerDept = overview.totalSops / overview.totalDepts;
  const sopRatio = Math.min(100, Math.max(0, (avgSopsPerDept / 10) * 100));
  const overdueRatio = Math.min(100, Math.max(0, (overview.avgOverduePerDept / 5) * 100));
  const raw = closedRatio * 0.5 + sopRatio * 0.3 + (100 - overdueRatio) * 0.2;
  return Math.round(raw * 10) / 10;
}

/**
 * 协作缺口（纯函数）：avgClosedRate<50 → "科室任务闭环差"；totalSops<5 → "SOP 沉淀不足"。
 *
 * @param overview 总览
 * @returns 缺口描述
 */
export function identifyDeptCollabGapV13(overview: DeptCollabOverviewV13): string {
  if (overview.avgClosedRate < 50) return "科室任务闭环差";
  if (overview.totalSops < 5) return "SOP 沉淀不足";
  return "协作健康";
}

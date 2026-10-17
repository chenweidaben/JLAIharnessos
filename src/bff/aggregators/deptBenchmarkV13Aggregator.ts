/**
 * 健澜科技 jlmedaios - 多科室横向对标 V13 纯函数（M310-B）
 *
 * rankDeptsByBenchmarkV13 / identifyBenchmarkDeptV13 / identifyLaggingDeptV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室对标输入 */
export interface DeptBenchmarkV13 {
  deptId: string;
  deptName: string;
  closureRate: number;
  sopCount: number;
  adoptionRate: number;
}

/** 带综合分的对标行 */
export interface BenchmarkRowV13 extends DeptBenchmarkV13 {
  compositeScore: number;
}

/**
 * 计算综合分（纯函数）：闭环率×0.4 + SOP数×20 + 建议采纳率×0.4。
 *
 * @param dept 科室
 * @returns 综合分
 */
export function computeCompositeScoreV13(dept: DeptBenchmarkV13): number {
  return dept.closureRate * 0.4 + dept.sopCount * 20 + dept.adoptionRate * 0.4;
}

/**
 * 按综合分降序（纯函数）。
 *
 * @param depts 科室
 * @returns 排序后
 */
export function rankDeptsByBenchmarkV13(depts: DeptBenchmarkV13[]): BenchmarkRowV13[] {
  return depts
    .map((d) => ({ ...d, compositeScore: computeCompositeScoreV13(d) }))
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * 标杆科室（纯函数）：Top1。
 *
 * @param ranked 已排序
 * @returns 标杆或 null
 */
export function identifyBenchmarkDeptV13(ranked: BenchmarkRowV13[]): BenchmarkRowV13 | null {
  return ranked.length > 0 ? ranked[0] : null;
}

/**
 * 落后科室（纯函数）：Bottom1。
 *
 * @param ranked 已排序
 * @returns 落后或 null
 */
export function identifyLaggingDeptV13(ranked: BenchmarkRowV13[]): BenchmarkRowV13 | null {
  return ranked.length > 0 ? ranked[ranked.length - 1] : null;
}

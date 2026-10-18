/**
 * 健澜科技 jlmedaios - 质控科室对比 V14 聚合器（M493-B）
 *
 * 纯函数：科室对比构建 + 科室指标对比。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室对比 */
export interface DeptCompareV14 {
  deptA: string;
  deptB: string;
  scoreA: number;
  scoreB: number;
}

/** 科室指标对比结果 */
export interface DeptMetricCompareV14 {
  gap: number;
  better: string;
}

/**
 * 构建科室对比。
 *
 * @param deptA 科室A
 * @param deptB 科室B
 * @param scoreA 科室A评分
 * @param scoreB 科室B评分
 * @returns 科室对比
 */
export function buildDeptCompare(deptA: string, deptB: string, scoreA: number, scoreB: number): DeptCompareV14 {
  return { deptA, deptB, scoreA, scoreB };
}

/**
 * 对比两科室指标（gap=scoreA-scoreB，better=高分科室）。
 *
 * @param deptA 科室A
 * @param scoreA 科室A评分
 * @param deptB 科室B
 * @param scoreB 科室B评分
 * @returns 对比结果
 */
export function compareDeptMetrics(deptA: string, scoreA: number, deptB: string, scoreB: number): DeptMetricCompareV14 {
  // 手算：gap = scoreA - scoreB；better = 高分科室，相等则"持平"
  const gap = scoreA - scoreB;
  let better = "持平";
  if (gap > 0) {
    better = deptA;
  } else if (gap < 0) {
    better = deptB;
  }
  return { gap, better };
}

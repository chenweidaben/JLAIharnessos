/**
 * 健澜科技 jlmedaios - 质控科室对比分析 V14 聚合器（M501-A）
 *
 * 纯函数：科室对比构建 + 对比结果聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室对比分析 */
export interface DeptCompareAnalysisV14 {
  deptA: string;
  scoreA: number;
  deptB: string;
  scoreB: number;
}

/** 聚合结果 */
export interface DeptCompareAggregateV14 {
  better: string;
  gap: number;
}

/**
 * 构建科室对比分析。
 *
 * @param deptA 科室A名称
 * @param scoreA 科室A评分
 * @param deptB 科室B名称
 * @param scoreB 科室B评分
 * @returns 科室对比分析
 */
export function buildDeptCompare(
  deptA: string,
  scoreA: number,
  deptB: string,
  scoreB: number,
): DeptCompareAnalysisV14 {
  return { deptA, scoreA, deptB, scoreB };
}

/**
 * 聚合对比结果（最高分科室 + 差距分）。
 *
 * @param pairs 对比对数组
 * @returns 聚合结果
 */
export function aggregateDeptCompare(
  pairs: { deptA: string; scoreA: number; deptB: string; scoreB: number }[],
): DeptCompareAggregateV14 {
  // 手算聚合：遍历所有对比对，找出最高分科室和最大差距
  let bestDept = "";
  let bestScore = -1;
  let maxGap = 0;
  for (const pair of pairs) {
    // 手算 gap：Math.max(scoreA, scoreB) - Math.min(scoreA, scoreB)
    const gap = Math.max(pair.scoreA, pair.scoreB) - Math.min(pair.scoreA, pair.scoreB);
    if (gap > maxGap) {
      maxGap = gap;
    }
    if (pair.scoreA > bestScore) {
      bestScore = pair.scoreA;
      bestDept = pair.deptA;
    }
    if (pair.scoreB > bestScore) {
      bestScore = pair.scoreB;
      bestDept = pair.deptB;
    }
  }
  return { better: bestDept, gap: maxGap };
}

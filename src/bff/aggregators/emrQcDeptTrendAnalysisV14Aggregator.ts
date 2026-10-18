/**
 * 健澜科技 jlmedaios - 质控科室趋势分析 V14 聚合器（M501-B）
 *
 * 纯函数：科室趋势构建 + 趋势结果聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室趋势分析 */
export interface DeptTrendAnalysisV14 {
  dept: string;
  monthlyScores: number[];
}

/** 聚合结果 */
export interface DeptTrendAggregateV14 {
  improving: number;
  declining: number;
}

/**
 * 构建科室趋势分析。
 *
 * @param dept 科室名称
 * @param monthlyScores 月度评分数组
 * @returns 科室趋势分析
 */
export function buildDeptTrend(dept: string, monthlyScores: number[]): DeptTrendAnalysisV14 {
  return { dept, monthlyScores };
}

/**
 * 聚合趋势结果（上升科室数 + 下降科室数）。
 *
 * @param trends 趋势数组
 * @returns 聚合结果
 */
export function aggregateDeptTrend(trends: DeptTrendAnalysisV14[]): DeptTrendAggregateV14 {
  // 手算趋势方向：首月与末月比较，末>首=上升，末<首=下降，相等=持平
  let improving = 0;
  let declining = 0;
  for (const trend of trends) {
    if (trend.monthlyScores.length < 2) {
      continue;
    }
    const first = trend.monthlyScores[0];
    const last = trend.monthlyScores[trend.monthlyScores.length - 1];
    if (last > first) {
      improving += 1;
    } else if (last < first) {
      declining += 1;
    }
  }
  return { improving, declining };
}

/**
 * 健澜科技 jlmedaios - 质控科室看板 V14 聚合器（M493-A）
 *
 * 纯函数：科室质控看板构建 + 科室指标聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室指标 */
export interface DeptMetricV14 {
  name: string;
  value: number;
}

/** 科室质控看板 */
export interface DeptDashboardV14 {
  dept: string;
  metrics: DeptMetricV14[];
}

/**
 * 构建科室质控看板。
 *
 * @param dept 科室名称
 * @param metrics 指标列表
 * @returns 科室质控看板
 */
export function buildDeptDashboard(dept: string, metrics: DeptMetricV14[]): DeptDashboardV14 {
  return { dept, metrics };
}

/**
 * 聚合科室指标（指标数+平均分）。
 *
 * @param metrics 指标列表
 * @returns 聚合结果
 */
export function aggregateDeptMetrics(metrics: DeptMetricV14[]): { count: number; avgValue: number } {
  const count = metrics.length;
  if (count === 0) {
    return { count: 0, avgValue: 0 };
  }
  // 手算：avgValue = sum / count 保留 1 位小数
  const sum = metrics.reduce((acc, m) => acc + m.value, 0);
  const avgValue = Math.round((sum / count) * 10) / 10;
  return { count, avgValue };
}

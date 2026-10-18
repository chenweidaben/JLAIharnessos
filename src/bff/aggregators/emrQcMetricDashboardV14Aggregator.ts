/**
 * 健澜科技 jlmedaios - 质控指标看板 V14 聚合器（M484-A）
 *
 * 纯函数：看板构建 + 指标聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 看板 */
export interface DashboardV14 {
  title: string;
  metrics: { name: string; value: number }[];
}

/** 看板指标聚合结果 */
export interface DashboardAggregateV14 {
  count: number;
  avgValue: number;
}

/**
 * 构建看板。
 *
 * @param title 看板标题
 * @param metrics 指标数组
 * @returns 看板
 */
export function buildDashboard(title: string, metrics: { name: string; value: number }[]): DashboardV14 {
  return { title, metrics };
}

/**
 * 聚合指标数和平均值：avgValue = sum/count（1 位小数）。
 *
 * @param metrics 指标数组
 * @returns 聚合结果
 */
export function aggregateDashboardMetrics(metrics: { name: string; value: number }[]): DashboardAggregateV14 {
  const count = metrics.length;
  if (count === 0) {
    return { count: 0, avgValue: 0 };
  }
  const sum = metrics.reduce((acc, m) => acc + m.value, 0);
  const avgValue = Math.round((sum / count) * 10) / 10;
  return { count, avgValue };
}

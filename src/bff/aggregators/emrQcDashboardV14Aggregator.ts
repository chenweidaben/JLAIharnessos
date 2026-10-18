/**
 * 健澜科技 jlmedaios - 病历质控指标体系大屏 V14 聚合器（M468-A）
 *
 * 纯函数：通过率/缺陷率计算 + 环比趋势。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控大屏输入数据 */
export interface QcDashboardInputV14 {
  totalRecords: number;
  passCount: number;
  defectCount: number;
}

/** 质控大屏输出 */
export interface QcDashboardOutputV14 {
  passRate: number;
  defectRate: number;
  totalRecords: number;
}

/** 趋势结果 */
export interface IndicatorTrendV14 {
  change: number;
  direction: "up" | "down" | "flat";
}

/**
 * 计算通过率与缺陷率（整数百分比，分母为 0 时返回 0）。
 *
 * @param data 质控数据
 * @returns 大屏指标
 */
export function buildQcDashboard(data: QcDashboardInputV14): QcDashboardOutputV14 {
  const passRate = data.totalRecords > 0 ? Math.round((data.passCount / data.totalRecords) * 100) : 0;
  const defectRate = data.totalRecords > 0 ? Math.round((data.defectCount / data.totalRecords) * 100) : 0;
  return { passRate, defectRate, totalRecords: data.totalRecords };
}

/**
 * 计算环比趋势：current - previous。
 *
 * @param current 本月值
 * @param previous 上月值
 * @returns 趋势结果
 */
export function computeIndicatorTrend(current: number, previous: number): IndicatorTrendV14 {
  const change = Math.round((current - previous) * 100) / 100;
  if (change > 0) return { change, direction: "up" };
  if (change < 0) return { change, direction: "down" };
  return { change: 0, direction: "flat" };
}

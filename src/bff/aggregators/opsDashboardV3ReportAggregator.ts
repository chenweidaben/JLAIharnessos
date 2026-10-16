/**
 * 健澜科技 jlmedaios - 医院运营驾驶舱 V3 纯函数（M240-A）
 *
 * buildOpsDashboardV3Report / predictOperations / detectAnomaly
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 预测运营（纯函数）。
 *
 * @param history 历史
 * @param horizon 预测期
 * @returns 预测
 */
export function predictOperations(history: number[], horizon: number): { forecast: number[]; capacity: string } {
  const last = history.length > 0 ? history[history.length - 1] : 0;
  const forecast: number[] = [];
  for (let i = 0; i < horizon; i++) forecast.push(Math.round(last * 1.02));
  let capacity = "正常";
  if (last > 5000) capacity = "预警";
  return { forecast, capacity };
}

/**
 * 检测异常（纯函数）。
 *
 * @param metrics 指标
 * @param threshold 阈值
 * @returns 异常
 */
export function detectAnomaly(metrics: number[], threshold: number): { anomalies: number[]; count: number } {
  const anomalies = metrics.filter((m) => m > threshold);
  return { anomalies, count: anomalies.length };
}

/** 运营驾驶舱 V3 报告输出 */
export interface OpsDashboardV3Report {
  timeRange: string;
  realtime: { outpatient: number; inpatient: number; surgery: number; bed: number };
  forecast: { next7d: number; capacityAlert: number };
  meetings: { daily: number; weekly: number; monthly: number };
  benchmark: { rank: number };
  suggestions: string[];
}

/**
 * 构建运营驾驶舱 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 运营驾驶舱 V3 报告
 */
export function buildOpsDashboardV3Report(timeRange: string): OpsDashboardV3Report {
  return {
    timeRange,
    realtime: { outpatient: 8000, inpatient: 2000, surgery: 200, bed: 1800 },
    forecast: { next7d: 56000, capacityAlert: 2 },
    meetings: { daily: 1, weekly: 1, monthly: 1 },
    benchmark: { rank: 5 },
    suggestions: ["提升床位周转", "降低平均住院日"],
  };
}

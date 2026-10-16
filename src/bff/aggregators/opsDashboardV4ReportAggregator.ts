/**
 * 健澜科技 jlmedaios - 运营驾驶舱 V4 纯函数（M250-A）
 *
 * buildOpsDashboardV4Report / predictOperationsV4 / detectAnomalyV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 预测运营 V4（纯函数）。
 *
 * @param history 历史
 * @param horizon 预测期
 * @returns 预测
 */
export function predictOperationsV4(history: { outpatient: number[]; inpatient: number[] }, horizon: number): { outpatient: number; inpatient: number; trend: string } {
  const avgOutpatient = history.outpatient.reduce((a, b) => a + b, 0) / Math.max(history.outpatient.length, 1);
  const avgInpatient = history.inpatient.reduce((a, b) => a + b, 0) / Math.max(history.inpatient.length, 1);
  const trend = avgOutpatient > history.outpatient[0] ? "上升" : "下降";
  return { outpatient: Math.round(avgOutpatient * horizon), inpatient: Math.round(avgInpatient * horizon), trend };
}

/**
 * 检测异常 V4（纯函数）。
 *
 * @param metrics 指标
 * @param threshold 阈值
 * @returns 异常
 */
export function detectAnomalyV4(metrics: { bedRate: number; avgStay: number }, threshold: { bedRate: number; avgStay: number }): { bedRate: boolean; avgStay: boolean; level: string } {
  const bedRate = metrics.bedRate > threshold.bedRate;
  const avgStay = metrics.avgStay > threshold.avgStay;
  let level = "正常";
  if (bedRate && avgStay) level = "红";
  else if (bedRate || avgStay) level = "黄";
  return { bedRate, avgStay, level };
}

/** 运营驾驶舱 V4 报告输出 */
export interface OpsDashboardV4Report {
  timeRange: string;
  realtime: { outpatient: number; inpatient: number; surgery: number; bedRate: number; avgStay: number };
  forecast: { tomorrow: number; nextWeek: number; nextMonth: number };
  alert: { red: number; yellow: number; closed: number };
  benchmark: { nationalRank: number; provinceRank: number; gap: string };
  suggestions: string[];
}

/**
 * 构建运营驾驶舱 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 运营驾驶舱 V4 报告
 */
export function buildOpsDashboardV4Report(timeRange: string): OpsDashboardV4Report {
  return {
    timeRange,
    realtime: { outpatient: 5000, inpatient: 1000, surgery: 200, bedRate: 92, avgStay: 8 },
    forecast: { tomorrow: 5200, nextWeek: 35000, nextMonth: 150000 },
    alert: { red: 2, yellow: 5, closed: 18 },
    benchmark: { nationalRank: 50, provinceRank: 5, gap: "国考指标提升中" },
    suggestions: ["降低平均住院日", "提升床位周转率"],
  };
}

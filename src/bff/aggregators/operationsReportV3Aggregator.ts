/**
 * 健澜科技 jlmedaios - 运营分析深化 V3 纯函数（M207-A）
 *
 * buildOperationsReportV3 / calculateCostEfficiency / forecastVolume
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算成本效益（纯函数）。
 *
 * @param cost 成本
 * @param revenue 收入
 * @returns 效益评估
 */
export function calculateCostEfficiency(cost: number, revenue: number): { margin: number; profitable: boolean; ratio: number } {
  const margin = revenue - cost;
  const ratio = cost > 0 ? revenue / cost : 0;
  return { margin, profitable: margin > 0, ratio };
}

/**
 * 运营量预测（纯函数）。
 *
 * @param history 历史数据数组
 * @param trend 趋势系数
 * @returns 预测值
 */
export function forecastVolume(history: number[], trend: number): number {
  if (history.length === 0) return 0;
  const avg = history.reduce((s, v) => s + v, 0) / history.length;
  return Math.round(avg * trend);
}

/** 运营 V3 报告输出 */
export interface OperationsReportV3 {
  timeRange: string;
  outpatient: { visits: number; avgRevenue: number };
  inpatient: { admissions: number; avgStayDays: number; occupancyRate: number };
  surgery: { cases: number; orUtilization: number };
  tech: { exams: number; revenue: number };
  cost: { total: number; perVisit: number };
  efficiency: { costRatio: number };
  forecast: { nextMonthVisits: number };
  dashboard: { realtime: boolean };
  suggestions: string[];
}

/**
 * 构建运营 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 运营 V3 报告
 */
export function buildOperationsReportV3(timeRange: string): OperationsReportV3 {
  return {
    timeRange,
    outpatient: { visits: 100000, avgRevenue: 500 },
    inpatient: { admissions: 10000, avgStayDays: 8, occupancyRate: 0.9 },
    surgery: { cases: 5000, orUtilization: 0.85 },
    tech: { exams: 200000, revenue: 50000000 },
    cost: { total: 500000000, perVisit: 400 },
    efficiency: { costRatio: 0.8 },
    forecast: { nextMonthVisits: 105000 },
    dashboard: { realtime: true },
    suggestions: ['提高床位使用率', '降低次均成本'],
  };
}

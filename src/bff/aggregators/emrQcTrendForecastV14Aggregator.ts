/**
 * 健澜科技 jlmedaios - 质控缺陷趋势预测 V14 聚合器（M495-A）
 *
 * 纯函数：缺陷趋势预测 + 预测报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 缺陷趋势预测结果 */
export interface TrendForecastResultV14 {
  history: { month: string; defects: number }[];
  trendDirection: string;
  predictedNext: number;
}

/** 预测报告 */
export interface TrendForecastReportV14 {
  trendDirection: string;
  predictedNext: number;
}

/**
 * 预测缺陷趋势（简单线性外推）。
 *
 * @param history 历史缺陷数
 * @returns 趋势预测结果
 */
export function forecastDefectTrend(history: { month: string; defects: number }[]): TrendForecastResultV14 {
  if (history.length === 0) {
    return { history, trendDirection: "持平", predictedNext: 0 };
  }
  // 手算趋势方向：近 3 月首末比较，递减=下降/递增=上升/持平=持平
  const first = history[0].defects;
  const last = history[history.length - 1].defects;
  let trendDirection = "持平";
  if (last < first) {
    trendDirection = "下降";
  } else if (last > first) {
    trendDirection = "上升";
  }
  // 简单线性外推：预测值 = 最近值 + 变化量
  const delta = history.length >= 2 ? last - history[0].defects : 0;
  const predictedNext = Math.max(0, last + delta);
  return { history, trendDirection, predictedNext };
}

/**
 * 构建预测报告（trendDirection+predictedNext）。
 *
 * @param result 趋势预测结果
 * @returns 预测报告
 */
export function buildTrendForecastReport(result: TrendForecastResultV14): TrendForecastReportV14 {
  return { trendDirection: result.trendDirection, predictedNext: result.predictedNext };
}

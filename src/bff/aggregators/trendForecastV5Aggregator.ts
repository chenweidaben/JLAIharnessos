/**
 * 健澜科技 jlmedaios - 趋势预测与经营预警 V5 纯函数（M287-D）
 *
 * forecastTrendV5 / detectAnomalyV5 / buildTrendReportV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 历史点 */
export interface TrendPoint {
  date: string;
  actual: number;
}

/**
 * 线性外推 V5（纯函数）：取最近两点斜率，外推下一步。
 *
 * @param history 历史点列表（按时间升序）
 * @returns 下一步预测值
 */
export function forecastTrendV5(history: TrendPoint[]): { nextForecast: number; slope: number } {
  if (history.length < 2) {
    return { nextForecast: history[0]?.actual ?? 0, slope: 0 };
  }
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const slope = Math.round((last.actual - prev.actual) * 100) / 100;
  return {
    nextForecast: Math.round((last.actual + slope) * 100) / 100,
    slope,
  };
}

/**
 * 异常检测 V5（纯函数）：actual > upper 即异常。
 *
 * @param actual 实际值
 * @param forecast 预测值
 * @param upper 上限
 * @returns 异常
 */
export function detectAnomalyV5(actual: number, forecast: number, upper: number): {
  isAnomaly: boolean;
  deviationPct: number;
} {
  const deviationPct = forecast !== 0
    ? Math.round(((actual - forecast) / Math.abs(forecast)) * 1000) / 10
    : 0;
  return {
    isAnomaly: actual > upper,
    deviationPct,
  };
}

/** 趋势报告输出 */
export interface TrendReport {
  metric: string;
  points: number;
  slope: number;
  nextForecast: number;
  anomalyCount: number;
}

/**
 * 趋势报告 V5（纯函数）：汇总一个指标序列。
 *
 * @param metric 指标名
 * @param history 历史点
 * @param uppers 对应上限数组（actual 与 uppers[i] 对齐）
 * @returns 报告
 */
export function buildTrendReportV5(metric: string, history: TrendPoint[], uppers: number[]): TrendReport {
  const f = forecastTrendV5(history);
  let anomalyCount = 0;
  history.forEach((p, i) => {
    const upper = uppers[i];
    if (upper !== undefined && p.actual > upper) anomalyCount += 1;
  });
  return {
    metric,
    points: history.length,
    slope: f.slope,
    nextForecast: f.nextForecast,
    anomalyCount,
  };
}

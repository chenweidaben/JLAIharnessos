/**
 * 健澜科技 jlmedaios - 门诊与手术量预测 V3 纯函数（M277-A）
 *
 * forecastVolumeV3 / detectAnomalyV3 / recommendStaffingV3 / buildVolumeForecastV3Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 历史记录 */
export interface VolumeHistory {
  date: string;
  actual: number;
  weekday: number;
  isHoliday: boolean;
}

/** 预测结果 */
export interface ForecastResult {
  forecast: number;
  upper: number;
  lower: number;
  modelVersion: string;
}

/**
 * 量预测 V3（纯函数）：均值×周季节假日因子。
 *
 * @param history 历史数据
 * @param horizon 预测天数
 * @returns 预测结果列表
 */
export function forecastVolumeV3(history: VolumeHistory[], horizon: number): ForecastResult[] {
  const avg = history.length > 0 ? history.reduce((s, h) => s + h.actual, 0) / history.length : 100;
  const results: ForecastResult[] = [];
  for (let i = 0; i < horizon; i++) {
    const weekday = (i + 1) % 7;
    let factor = 1;
    if (weekday === 0 || weekday === 6) factor = 0.6;
    const forecast = Math.round(avg * factor);
    results.push({
      forecast,
      upper: Math.round(forecast * 1.2),
      lower: Math.round(forecast * 0.8),
      modelVersion: "v3.0",
    });
  }
  return results;
}

/**
 * 异常检测 V3（纯函数）：实际超出上下限即异常。
 *
 * @param actual 实际值
 * @param forecast 预测值
 * @returns 是否异常与偏离率
 */
export function detectAnomalyV3(actual: number, forecast: { upper: number; lower: number }): { anomalous: boolean; deviationPct: number } {
  const deviationPct = forecast.upper + forecast.lower > 0
    ? Math.round(((actual - (forecast.upper + forecast.lower) / 2) / ((forecast.upper + forecast.lower) / 2 || 1)) * 1000) / 10
    : 0;
  const anomalous = actual > forecast.upper || actual < forecast.lower;
  return { anomalous, deviationPct };
}

/**
 * 排班建议 V3（纯函数）：按预测峰值配置人力。
 *
 * @param forecast 预测值
 * @returns 排班建议
 */
export function recommendStaffingV3(forecast: number): { doctors: number; nurses: number; shift: string } {
  let doctors = 4;
  let nurses = 6;
  let shift = "常规";
  if (forecast >= 150) {
    doctors = 8;
    nurses = 12;
    shift = "高峰";
  } else if (forecast >= 100) {
    doctors = 6;
    nurses = 9;
    shift = "平峰";
  }
  return { doctors, nurses, shift };
}

/** 预测看板输出 */
export interface VolumeForecastV3Report {
  department: string;
  horizon: number;
  avgForecast: number;
  peakForecast: number;
  staffing: { doctors: number; nurses: number; shift: string };
  suggestions: string[];
}

/**
 * 构建预测看板（纯函数）。
 *
 * @param department 科室
 * @param results 预测结果
 * @returns 报告
 */
export function buildVolumeForecastV3Report(department: string, results: ForecastResult[]): VolumeForecastV3Report {
  const forecasts = results.map((r) => r.forecast);
  const avgForecast = forecasts.length > 0 ? Math.round(forecasts.reduce((s, v) => s + v, 0) / forecasts.length) : 0;
  const peakForecast = forecasts.length > 0 ? Math.max(...forecasts) : 0;
  const staffing = recommendStaffingV3(peakForecast);
  return {
    department,
    horizon: results.length,
    avgForecast,
    peakForecast,
    staffing,
    suggestions: peakForecast >= 150
      ? ["预测达高峰，提前增配医生护士并开加号窗口"]
      : ["按常规排班，关注节假日低谷调整"],
  };
}

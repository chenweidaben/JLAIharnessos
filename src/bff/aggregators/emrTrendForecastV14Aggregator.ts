/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预测 V14 聚合器（M470-A）
 *
 * 纯函数：简单线性外推 + 图表数据组装。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 图表数据 */
export interface ForecastChartV14 {
  history: number[];
  forecast: number[];
}

/**
 * 简单线性外推预测未来 N 个月值。
 * 取最后 3 个月数据算平均斜率：(last - first) / 2
 * forecast[i] = last + slope * (i+1)
 *
 * @param history 历史数据（至少 3 个月）
 * @param futureMonths 预测未来月数
 * @returns 预测值列表
 */
export function linearForecast(history: number[], futureMonths: number): number[] {
  if (futureMonths <= 0 || history.length < 3) return [];
  const last3 = history.slice(-3);
  const first = last3[0];
  const last = last3[last3.length - 1];
  const slope = (last - first) / 2;
  const result: number[] = [];
  for (let i = 1; i <= futureMonths; i++) {
    result.push(Math.round((last + slope * i) * 10) / 10);
  }
  return result;
}

/**
 * 组装图表数据（历史实线 + 预测虚线）。
 *
 * @param history 历史数据
 * @param forecast 预测数据
 * @returns 图表数据
 */
export function buildForecastChart(history: number[], forecast: number[]): ForecastChartV14 {
  return { history, forecast };
}

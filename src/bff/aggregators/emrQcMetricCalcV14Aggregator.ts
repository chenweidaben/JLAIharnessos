/**
 * 健澜科技 jlmedaios - 质控指标计算 V14 聚合器（M483-B）
 *
 * 纯函数：指标值计算 + 指标聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 指标计算结果 */
export interface QcMetricResultV14 {
  name: string;
  numerator: number;
  denominator: number;
  value: number;
}

/** 指标聚合结果 */
export interface QcMetricAggregateV14 {
  avgValue: number;
  count: number;
}

/**
 * 计算指标值：value = numerator/denominator×100（1 位小数），分母为 0 返回 0。
 *
 * @param name 指标名
 * @param numerator 分子
 * @param denominator 分母
 * @returns 指标计算结果
 */
export function calcQcMetric(name: string, numerator: number, denominator: number): QcMetricResultV14 {
  if (denominator === 0) {
    return { name, numerator, denominator, value: 0 };
  }
  const value = Math.round((numerator / denominator) * 1000) / 10;
  return { name, numerator, denominator, value };
}

/**
 * 聚合指标：avgValue = sum/count（1 位小数）。
 *
 * @param metrics 指标数组
 * @returns 聚合结果
 */
export function aggregateQcMetrics(metrics: { name: string; value: number }[]): QcMetricAggregateV14 {
  const count = metrics.length;
  if (count === 0) {
    return { avgValue: 0, count: 0 };
  }
  const sum = metrics.reduce((acc, m) => acc + m.value, 0);
  const avgValue = Math.round((sum / count) * 10) / 10;
  return { avgValue, count };
}

/**
 * 健澜科技 jlmedaios - 质控科室预警阈值 V14 聚合器（M495-B）
 *
 * 纯函数：预警阈值构建 + 阈值检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预警阈值 */
export interface AlertThresholdV14 {
  dept: string;
  metric: string;
  threshold: number;
}

/** 阈值检查结果 */
export interface AlertThresholdCheckV14 {
  dept: string;
  metric: string;
  actual: number;
  threshold: number;
  alerted: boolean;
}

/**
 * 构建预警阈值。
 *
 * @param dept 科室
 * @param metric 指标
 * @param threshold 阈值
 * @returns 预警阈值
 */
export function buildAlertThreshold(dept: string, metric: string, threshold: number): AlertThresholdV14 {
  return { dept, metric, threshold };
}

/**
 * 检查是否触发预警（actual > threshold 则 alerted=true）。
 *
 * @param dept 科室
 * @param metric 指标
 * @param actual 实际值
 * @param threshold 阈值
 * @returns 检查结果
 */
export function checkAlertThreshold(dept: string, metric: string, actual: number, threshold: number): AlertThresholdCheckV14 {
  // 手算：actual > threshold 才触发，等于不触发
  const alerted = actual > threshold;
  return { dept, metric, actual, threshold, alerted };
}

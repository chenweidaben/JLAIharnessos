/**
 * 健澜科技 jlmedaios - 病历质控指标预警阈值配置 V14 聚合器（M469-A）
 *
 * 纯函数：阈值评估（数值越低越危险）+ 预警汇总。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预警状态 */
export type AlertStatusV14 = "normal" | "warn" | "danger";

/** 阈值配置 */
export interface AlertThresholdV14 {
  warn: number;
  danger: number;
}

/** 预警汇总项 */
export interface AlertSummaryItemV14 {
  indicator: string;
  value: number;
  status: AlertStatusV14;
}

/** 预警汇总结果 */
export interface AlertSummaryV14 {
  total: number;
  warnCount: number;
  dangerCount: number;
}

/**
 * 评估指标状态（数值越低越危险）：
 * value <= danger → 'danger'
 * value <= warn  → 'warn'
 * 否则           → 'normal'
 *
 * @param value 指标当前值
 * @param threshold 阈值配置
 * @returns 预警状态
 */
export function evaluateAlert(value: number, threshold: AlertThresholdV14): AlertStatusV14 {
  if (value <= threshold.danger) return "danger";
  if (value <= threshold.warn) return "warn";
  return "normal";
}

/**
 * 汇总预警数量。
 *
 * @param items 预警项列表
 * @returns 汇总结果
 */
export function buildAlertSummary(items: AlertSummaryItemV14[]): AlertSummaryV14 {
  const total = items.length;
  const warnCount = items.filter((i) => i.status === "warn").length;
  const dangerCount = items.filter((i) => i.status === "danger").length;
  return { total, warnCount, dangerCount };
}

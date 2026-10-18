/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预警 V14 聚合器（M475-A）
 *
 * 纯函数：趋势方向判定 + 生成预警卡片。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 趋势方向 */
export type TrendDirectionV14 = "up" | "down" | "flat";

/** 趋势预警 */
export interface TrendAlertV14 {
  indicator: string;
  current: number;
  previous: number;
  gap: number;
  direction: TrendDirectionV14;
}

/**
 * 评估趋势方向：current>previous→up，current<previous→down，相等→flat。
 *
 * @param current 当前值
 * @param previous 上一期值
 * @returns 趋势方向
 */
export function evaluateTrendDirection(current: number, previous: number): TrendDirectionV14 {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

/**
 * 生成趋势预警卡片，含 gap 和 direction。
 *
 * @param indicator 指标名
 * @param current 当前值
 * @param previous 上一期值
 * @returns 预警卡片
 */
export function buildTrendAlert(indicator: string, current: number, previous: number): TrendAlertV14 {
  return {
    indicator,
    current,
    previous,
    gap: current - previous,
    direction: evaluateTrendDirection(current, previous),
  };
}

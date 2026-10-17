/**
 * 健澜科技 jlmedaios - 门诊流量预测与分时段建议 V13 纯函数（M313-B）
 *
 * forecastDailyOutpatientV13 / forecastTimeSlotV13 / suggestSlotAllocationV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 历史门诊 */
export interface OutpatientHistoryV13 {
  dayOfWeek: number;
  volume: number;
}

/** 时段权重 */
export interface SlotWeightV13 {
  slot: string;
  weight: number;
}

/**
 * 下周每日门诊量预测（纯函数）：取历史同日均值，返回 days 天的预测。
 *
 * @param history 历史数据
 * @param days 预测天数（从周一开始）
 * @returns 每日预测 [{dayOfWeek, volume}]
 */
export function forecastDailyOutpatientV13(
  history: OutpatientHistoryV13[],
  days: number,
): { dayOfWeek: number; volume: number }[] {
  const byDow = new Map<number, number[]>();
  for (const h of history) {
    const arr = byDow.get(h.dayOfWeek) ?? [];
    arr.push(h.volume);
    byDow.set(h.dayOfWeek, arr);
  }
  const result: { dayOfWeek: number; volume: number }[] = [];
  for (let i = 0; i < days; i++) {
    const dow = (i % 7) + 1;
    const arr = byDow.get(dow) ?? [];
    const avg = arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    result.push({ dayOfWeek: dow, volume: avg });
  }
  return result;
}

/**
 * 分时段流量预测（纯函数）：每日总量×时段权重。
 *
 * @param dailyTotal 每日总量
 * @param slotWeights 时段权重
 * @returns 分时段预测
 */
export function forecastTimeSlotV13(
  dailyTotal: number,
  slotWeights: SlotWeightV13[],
): { slot: string; volume: number }[] {
  return slotWeights.map((s) => ({
    slot: s.slot,
    volume: Math.round(dailyTotal * s.weight),
  }));
}

/**
 * 号源建议（纯函数）：高峰时段（volume >= 平均）加配号源。
 *
 * @param forecast 分时段预测
 * @returns 号源建议
 */
export function suggestSlotAllocationV13(
  forecast: { slot: string; volume: number }[],
): { slot: string; suggestion: string }[] {
  if (forecast.length === 0) return [];
  const avg = forecast.reduce((s, f) => s + f.volume, 0) / forecast.length;
  return forecast.map((f) => ({
    slot: f.slot,
    suggestion: f.volume >= avg ? "高峰加配号源" : "常规号源",
  }));
}

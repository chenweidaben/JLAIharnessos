/**
 * 健澜科技 jlmedaios - 患者安全事件总览 V13 纯函数（M322-B）
 *
 * countSafetyEventsByTypeV13 / computeYoyReductionRateV13 / buildSafetyOverviewV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安全事件 */
export interface SafetyEventV13 {
  eventId: string;
  type: "fall" | "bedsore" | "medicationError" | "surgicalComplication";
}

/** 事件分类计数 */
export interface SafetyEventCountV13 {
  fall: number;
  bedsore: number;
  medicationError: number;
  surgicalComplication: number;
}

/** 安全总览 */
export interface SafetyOverviewV13 {
  current: SafetyEventCountV13;
  yoyReductionRate: SafetyEventCountV13;
}

/**
 * 4 类本月发生数（纯函数）：跌倒/压疮/给药错误/手术并发症 分组计数。
 *
 * @param events 安全事件列表
 * @returns 分类计数
 */
export function countSafetyEventsByTypeV13(events: SafetyEventV13[]): SafetyEventCountV13 {
  const result: SafetyEventCountV13 = { fall: 0, bedsore: 0, medicationError: 0, surgicalComplication: 0 };
  for (const e of events) {
    if (e.type === "fall") result.fall++;
    else if (e.type === "bedsore") result.bedsore++;
    else if (e.type === "medicationError") result.medicationError++;
    else if (e.type === "surgicalComplication") result.surgicalComplication++;
  }
  return result;
}

/**
 * 同比下降率（纯函数）：(去年同期-本月)/去年同期×100。
 *
 * @param current 本月数
 * @param previous 去年同期数
 * @returns 同比下降率百分比
 */
export function computeYoyReductionRateV13(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((previous - current) / previous) * 100);
}

/**
 * 总览汇总（纯函数）：4 类 + 同比下降率。
 *
 * @param events 本月事件列表
 * @param lastYearEvents 去年同期事件列表
 * @returns 总览汇总
 */
export function buildSafetyOverviewV13(events: SafetyEventV13[], lastYearEvents: SafetyEventV13[]): SafetyOverviewV13 {
  const current = countSafetyEventsByTypeV13(events);
  const previous = countSafetyEventsByTypeV13(lastYearEvents);
  return {
    current,
    yoyReductionRate: {
      fall: computeYoyReductionRateV13(current.fall, previous.fall),
      bedsore: computeYoyReductionRateV13(current.bedsore, previous.bedsore),
      medicationError: computeYoyReductionRateV13(current.medicationError, previous.medicationError),
      surgicalComplication: computeYoyReductionRateV13(current.surgicalComplication, previous.surgicalComplication),
    },
  };
}

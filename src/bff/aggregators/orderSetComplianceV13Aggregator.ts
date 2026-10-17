/**
 * 健澜科技 jlmedaios - 医嘱套餐规范 V13 纯函数（M315-B）
 *
 * computeOrderSetUsageRateV13 / computeDeviationRateV13 / classifyDeviationReasonV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医嘱套餐记录 */
export interface OrderSetOrderV13 {
  orderId: string;
  dept: string;
  usedOrderSet: boolean;
  isDeviated: boolean;
  deviationReason?: string;
}

/**
 * 套餐使用率（纯函数）：用套餐的医嘱数/总医嘱数×100。
 *
 * @param orders 医嘱列表
 * @returns 使用率百分比
 */
export function computeOrderSetUsageRateV13(orders: OrderSetOrderV13[]): number {
  if (orders.length === 0) return 0;
  const used = orders.filter((o) => o.usedOrderSet).length;
  return Math.round((used / orders.length) * 100);
}

/**
 * 偏离率（纯函数）：偏离套餐的医嘱数/总医嘱数×100。
 *
 * @param orders 医嘱列表
 * @returns 偏离率百分比
 */
export function computeDeviationRateV13(orders: OrderSetOrderV13[]): number {
  if (orders.length === 0) return 0;
  const deviated = orders.filter((o) => o.isDeviated).length;
  return Math.round((deviated / orders.length) * 100);
}

/**
 * 偏离原因分类（纯函数）：按 reason 分组计数。
 *
 * @param deviations 偏离医嘱列表
 * @returns 原因 → 计数
 */
export function classifyDeviationReasonV13(
  deviations: OrderSetOrderV13[],
): { reason: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of deviations) {
    const reason = d.deviationReason ?? "未填写";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([reason, count]) => ({ reason, count }));
}

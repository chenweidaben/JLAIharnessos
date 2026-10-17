/**
 * 健澜科技 jlmedaios - 采购周期预警 V13 纯函数（M317-C）
 *
 * computeAvgLeadTimeV13 / flagLeadTimeAlertV13 / identifyDelayedOrdersV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 采购订单 */
export interface ProcurementOrderV13 {
  orderId: string;
  itemName: string;
  leadTimeDays: number;
}

/**
 * 平均采购周期（纯函数）：总到货天数/订单数。
 *
 * @param orders 订单列表
 * @returns 平均采购周期（天）
 */
export function computeAvgLeadTimeV13(orders: ProcurementOrderV13[]): number {
  if (orders.length === 0) return 0;
  const total = orders.reduce((s, o) => s + o.leadTimeDays, 0);
  return total / orders.length;
}

/**
 * 周期预警（纯函数）：实际周期 > avg×1.5 → 黄；> avg×2 → 红。
 *
 * @param order 订单
 * @param avgLeadTime 平均周期
 * @returns 预警等级（red/yellow/none）
 */
export function flagLeadTimeAlertV13(order: ProcurementOrderV13, avgLeadTime: number): "red" | "yellow" | "none" {
  if (avgLeadTime === 0) return "none";
  if (order.leadTimeDays > avgLeadTime * 2) return "red";
  if (order.leadTimeDays > avgLeadTime * 1.5) return "yellow";
  return "none";
}

/**
 * 延迟订单列表（纯函数）：实际周期 > avg×1.5。
 *
 * @param orders 订单列表
 * @param avgLeadTime 平均周期
 * @returns 延迟订单列表
 */
export function identifyDelayedOrdersV13(orders: ProcurementOrderV13[], avgLeadTime: number): ProcurementOrderV13[] {
  if (avgLeadTime === 0) return [];
  return orders.filter((o) => o.leadTimeDays > avgLeadTime * 1.5);
}

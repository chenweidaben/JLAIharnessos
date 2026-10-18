/**
 * 健澜科技 jlmedaios - 病历质控整改工单管理 V14 聚合器（M471-A）
 *
 * 纯函数：创建工单 + 状态机推进（pending→inProgress→completed）+ 按状态过滤。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 工单状态 */
export type OrderStatusV14 = "pending" | "inProgress" | "completed";

/** 整改工单 */
export interface RectificationOrderV14 {
  id: string;
  defect: string;
  assignee: string;
  status: OrderStatusV14;
}

/**
 * 创建整改工单，初始 status='pending'。
 *
 * @param defect 缺陷描述
 * @param assignee 处理人
 * @returns 工单
 */
export function buildOrder(defect: string, assignee: string): RectificationOrderV14 {
  return {
    id: `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    defect,
    assignee,
    status: "pending",
  };
}

/**
 * 推进工单状态：pending→inProgress→completed（completed 为终态）。
 *
 * @param order 工单
 * @returns 推进后的工单
 */
export function advanceOrderStatus(order: RectificationOrderV14): RectificationOrderV14 {
  if (order.status === "pending") {
    return { ...order, status: "inProgress" };
  }
  if (order.status === "inProgress") {
    return { ...order, status: "completed" };
  }
  return { ...order, status: "completed" };
}

/**
 * 按状态过滤工单。
 *
 * @param orders 工单列表
 * @param status 目标状态
 * @returns 过滤后的工单
 */
export function filterOrdersByStatus(
  orders: RectificationOrderV14[],
  status: OrderStatusV14,
): RectificationOrderV14[] {
  return orders.filter((o) => o.status === status);
}

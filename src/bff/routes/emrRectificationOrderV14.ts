/**
 * 健澜科技 jlmedaios - 病历质控整改工单管理 V14 路由（M471-A）
 *
 * GET  /api/v1/emr-rectification-order            （read，auth:true，query 用 new URL 取 status）返回工单列表
 * POST /api/v1/emr-rectification-order            （auth:true，body 用 await c.req.json()）创建工单
 * PUT  /api/v1/emr-rectification-order/:id/complete（auth:true，path 参数 c.params.id）完成工单
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  advanceOrderStatus,
  buildOrder,
  filterOrdersByStatus,
  type OrderStatusV14,
  type RectificationOrderV14,
} from "../aggregators/emrRectificationOrderV14Aggregator.js";

const demoOrders: RectificationOrderV14[] = [
  { id: "ORD-001", defect: "主诉缺失", assignee: "张三", status: "pending" },
  { id: "ORD-002", defect: "现病史过短", assignee: "李四", status: "inProgress" },
  { id: "ORD-003", defect: "诊断不规范", assignee: "王五", status: "completed" },
];

export const emrRectificationOrderV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-rectification-order",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rectification-order:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const status = (url.searchParams.get("status") ?? "") as OrderStatusV14 | "";
      const orders = status ? filterOrdersByStatus(demoOrders, status) : demoOrders;
      return json(ok({ orders, total: orders.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-rectification-order",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rectification-order:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { defect?: string; assignee?: string };
      const order = buildOrder(body.defect ?? "", body.assignee ?? "");
      return json(ok({ order }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/emr-rectification-order/:id/complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rectification-order:write");
      if (denied) return denied;
      const id = (c.params.id ?? "").trim();
      const order = demoOrders.find((o) => o.id === id);
      if (!order) {
        return json(ok({ found: false }));
      }
      const updated = advanceOrderStatus(order);
      return json(ok({ order: updated }));
    },
  },
];

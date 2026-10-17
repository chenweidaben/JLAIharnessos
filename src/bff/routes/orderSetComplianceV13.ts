/**
 * 健澜科技 jlmedaios - 医嘱套餐规范 V13 路由（M315-B）
 *
 * GET /api/v1/order-set-compliance?dept=
 *
 * 权限：order-set-compliance:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyDeviationReasonV13,
  computeDeviationRateV13,
  computeOrderSetUsageRateV13,
  type OrderSetOrderV13,
} from "../aggregators/orderSetComplianceV13Aggregator.js";

const orders: OrderSetOrderV13[] = [
  { orderId: "o1", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o2", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o3", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o4", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o5", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o6", dept: "cardio", usedOrderSet: true, isDeviated: false },
  { orderId: "o7", dept: "cardio", usedOrderSet: false, isDeviated: true, deviationReason: "药物剂量调整" },
  { orderId: "o8", dept: "cardio", usedOrderSet: false, isDeviated: true, deviationReason: "药物剂量调整" },
  { orderId: "o9", dept: "cardio", usedOrderSet: false, isDeviated: true, deviationReason: "特殊患者" },
  { orderId: "o10", dept: "cardio", usedOrderSet: false, isDeviated: false },
];

export const orderSetComplianceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/order-set-compliance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "order-set-compliance:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const deptOrders = orders.filter((o) => o.dept === dept);
      return json(ok({
        dept,
        usageRate: computeOrderSetUsageRateV13(deptOrders),
        deviationRate: computeDeviationRateV13(deptOrders),
        reasons: classifyDeviationReasonV13(deptOrders.filter((o) => o.isDeviated)),
      }));
    },
  },
];

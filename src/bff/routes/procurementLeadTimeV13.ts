/**
 * 健澜科技 jlmedaios - 采购周期预警 V13 路由（M317-C）
 *
 * GET /api/v1/procurement-lead-time
 *
 * 权限：procurement-lead-time:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgLeadTimeV13,
  flagLeadTimeAlertV13,
  identifyDelayedOrdersV13,
  type ProcurementOrderV13,
} from "../aggregators/procurementLeadTimeV13Aggregator.js";

const orders: ProcurementOrderV13[] = [
  { orderId: "o1", itemName: "注射器", leadTimeDays: 5 },
  { orderId: "o2", itemName: "输液器", leadTimeDays: 7 },
  { orderId: "o3", itemName: "纱布", leadTimeDays: 8 },
  { orderId: "o4", itemName: "手套", leadTimeDays: 10 },
  { orderId: "o5", itemName: "消毒用品", leadTimeDays: 12 },
  { orderId: "o6", itemName: "导管", leadTimeDays: 16 },
];

export const procurementLeadTimeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/procurement-lead-time",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "procurement-lead-time:read");
      if (denied) return denied;
      const avgLeadTime = computeAvgLeadTimeV13(orders);
      return json(ok({
        avgLeadTime,
        delayedOrders: identifyDelayedOrdersV13(orders, avgLeadTime).map((o) => ({
          ...o,
          alert: flagLeadTimeAlertV13(o, avgLeadTime),
        })),
      }));
    },
  },
];

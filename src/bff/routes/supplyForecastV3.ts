/**
 * 健澜科技 jlmedaios - 耗材库存与供应预测 V3 路由（M277-C）
 *
 * GET  /api/v1/supply-forecast（库存预警看板）
 * POST /api/v1/supply-forecast/order（自动补货建议）
 *
 * 权限：supply-forecast:read / supply-forecast:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSupplyForecastV3Report,
  optimizeInventoryV3,
  type SupplyItem,
} from "../aggregators/supplyForecastV3Aggregator.js";

const itemStore: SupplyItem[] = [
  { itemId: "iv-catheter", warehouse: "中心库", stock: 200, avgDailyUsage: 30, safetyStock: 50 },
  { itemId: "syringe-5ml", warehouse: "中心库", stock: 80, avgDailyUsage: 40, safetyStock: 40 },
  { itemId: "gauze", warehouse: "中心库", stock: 500, avgDailyUsage: 20, safetyStock: 30 },
];

export const supplyForecastV3Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/supply-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "supply-forecast:read");
      if (denied) return denied;

      const leadTimeDays = Number(c.query.get("leadTimeDays") ?? "7");
      return json(ok(buildSupplyForecastV3Report(itemStore, leadTimeDays)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/supply-forecast/order",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "supply-forecast:write");
      if (denied) return denied;

      const body = await c.req.json() as { itemId: string; leadTimeDays: number };
      const item = itemStore.find((i) => i.itemId === body.itemId);
      if (!item) {
        return json(ok({ found: false }));
      }
      return json(ok({ found: true, ...optimizeInventoryV3(item, body.leadTimeDays) }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 耗材库存 V13 路由（M328-B）
 *
 * GET /api/v1/consumable-inventory
 *
 * 权限：consumable-inventory:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  countLowStockItemsV13,
  countMonthlyUsageV13,
  countNearExpiryItemsV13,
  type ConsumableItemV13,
} from "../aggregators/consumableInventoryV13Aggregator.js";

const items: ConsumableItemV13[] = [
  { name: "注射器", stock: 100, safetyStock: 200, daysToExpiry: 60, monthlyUsage: 100 },
  { name: "输液器", stock: 50, safetyStock: 100, daysToExpiry: 20, monthlyUsage: 50 },
  { name: "纱布", stock: 300, safetyStock: 100, daysToExpiry: 90, monthlyUsage: 30 },
  { name: "手套", stock: 20, safetyStock: 50, daysToExpiry: 15, monthlyUsage: 20 },
  { name: "口罩", stock: 500, safetyStock: 200, daysToExpiry: 120, monthlyUsage: 10 },
];

export const consumableInventoryV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/consumable-inventory",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "consumable-inventory:read");
      if (denied) return denied;
      return json(ok({
        lowStock: countLowStockItemsV13(items),
        nearExpiry: countNearExpiryItemsV13(items),
        monthlyUsage: countMonthlyUsageV13(items),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 药房库存预警 V13 路由（M312-B）
 *
 * GET /api/v1/pharmacy-inventory-alert?days=
 *
 * 权限：pharmacy-inventory-alert:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  checkExpiringSoonV13,
  checkLowStockV13,
  suggestReorderV13,
  type PharmacyItemV13,
} from "../aggregators/pharmacyInventoryAlertV13Aggregator.js";

const items: PharmacyItemV13[] = [
  { itemId: "m1", name: "阿司匹林", currentStock: 10, safetyStock: 20, expiryDaysFromNow: 5 },
  { itemId: "m2", name: "头孢", currentStock: 50, safetyStock: 30, expiryDaysFromNow: 30 },
  { itemId: "m3", name: "布洛芬", currentStock: 5, safetyStock: 15, expiryDaysFromNow: 10 },
];

export const pharmacyInventoryAlertV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-inventory-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-inventory-alert:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const days = Number(url.searchParams.get("days") ?? "7");
      const lowStock = checkLowStockV13(items);
      return json(ok({
        lowStock,
        reorders: lowStock.map(suggestReorderV13),
        expiringSoon: checkExpiringSoonV13(items, days),
        days,
      }));
    },
  },
];

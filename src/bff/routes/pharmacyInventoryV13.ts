/**
 * 健澜科技 jlmedaios - 药品库存 V13 路由（M328-C）
 *
 * GET /api/v1/pharmacy-inventory
 *
 * 权限：pharmacy-inventory:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInventoryVarianceRateV13,
  countNearExpiryDrugsV13,
  countOutOfStockDrugsV13,
  type PharmacyDrugV13,
} from "../aggregators/pharmacyInventoryV13Aggregator.js";

const drugs: PharmacyDrugV13[] = [
  { name: "阿莫西林", stock: 100, daysToExpiry: 60, hasVariance: false },
  { name: "头孢", stock: 50, daysToExpiry: 30, hasVariance: false },
  { name: "布洛芬", stock: 0, daysToExpiry: 120, hasVariance: false },
  { name: "维生素C", stock: 200, daysToExpiry: 180, hasVariance: false },
  { name: "奥美拉唑", stock: 0, daysToExpiry: 45, hasVariance: false },
  { name: "二甲双胍", stock: 80, daysToExpiry: 90, hasVariance: false },
  { name: "阿托伐他汀", stock: 60, daysToExpiry: 200, hasVariance: false },
  { name: "阿司匹林", stock: 150, daysToExpiry: 150, hasVariance: false },
  { name: "氯吡格雷", stock: 90, daysToExpiry: 100, hasVariance: false },
  { name: "单硝酸异山梨酯", stock: 40, daysToExpiry: 300, hasVariance: true },
];

export const pharmacyInventoryV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-inventory",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-inventory:read");
      if (denied) return denied;
      return json(ok({
        nearExpiry: countNearExpiryDrugsV13(drugs),
        outOfStock: countOutOfStockDrugsV13(drugs),
        varianceRate: computeInventoryVarianceRateV13(drugs),
      }));
    },
  },
];

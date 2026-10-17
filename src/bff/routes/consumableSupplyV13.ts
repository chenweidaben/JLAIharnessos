/**
 * 健澜科技 jlmedaios - 耗材供应 V13 路由（M408-B）
 *
 * GET /api/v1/consumable-supply
 *
 * 权限：consumable-supply:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConsumableInventoryTurnoverDaysV13,
  computeConsumableStockoutRateV13,
  computeHighValueConsumableTraceabilityRateV13,
  type ConsumableSupplyRecordV13,
} from "../aggregators/consumableSupplyV13Aggregator.js";

const records: ConsumableSupplyRecordV13[] = [
  { traceable: 980, total: 1000, turnoverDays: 25.5, stockout: 20, purchase: 1000 },
  { traceable: 980, total: 1000, turnoverDays: 25.5, stockout: 20, purchase: 1000 },
];

export const consumableSupplyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/consumable-supply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "consumable-supply:read");
      if (denied) return denied;
      return json(ok({
        highValueConsumableTraceabilityRate: computeHighValueConsumableTraceabilityRateV13(records),
        consumableInventoryTurnoverDays: computeConsumableInventoryTurnoverDaysV13(records),
        consumableStockoutRate: computeConsumableStockoutRateV13(records),
      }));
    },
  },
];

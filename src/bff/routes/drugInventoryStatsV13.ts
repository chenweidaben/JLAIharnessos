/**
 * 健澜科技 jlmedaios - 药品库存管理 V13 路由（M359-C，stats 避让已有 drugInventory）
 *
 * GET /api/v1/drug-inventory-stats
 *
 * 权限：drug-inventory-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugInventoryTurnoverRateV13,
  computeMonthlyDrugShortageTimesV13,
  computeNearExpiryDrugRatioV13,
  type DrugInventoryStatsRecordV13,
} from "../aggregators/drugInventoryStatsV13Aggregator.js";

const records: DrugInventoryStatsRecordV13[] = [
  { outboundAmount: 800, avgInventoryAmount: 200, nearExpiryCategory: 10, totalCategory: 200, monthlyShortageTimes: 3 },
  { outboundAmount: 800, avgInventoryAmount: 200, nearExpiryCategory: 10, totalCategory: 200, monthlyShortageTimes: 2 },
];

export const drugInventoryStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-inventory-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-inventory-stats:read");
      if (denied) return denied;
      return json(ok({
        turnoverRate: computeDrugInventoryTurnoverRateV13(records),
        nearExpiryRatio: computeNearExpiryDrugRatioV13(records),
        monthlyShortageTimes: computeMonthlyDrugShortageTimesV13(records),
      }));
    },
  },
];

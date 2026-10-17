/**
 * 健澜科技 jlmedaios - 收入结构明细 V13 路由（M396-B，避让旧版 revenueStructureV13/revenueStructureStatsV13）
 *
 * GET /api/v1/revenue-structure-detail
 *
 * 权限：revenue-structure-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeMedicalRevenueRatioV13,
  type RevenueStructureDetailRecordV13,
} from "../aggregators/revenueStructureDetailV13Aggregator.js";

const records: RevenueStructureDetailRecordV13[] = [
  { medicalRevenue: 600, totalRevenue: 1000, drugRevenue: 200, consumableRevenue: 100 },
  { medicalRevenue: 600, totalRevenue: 1000, drugRevenue: 200, consumableRevenue: 100 },
];

export const revenueStructureDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/revenue-structure-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "revenue-structure-detail:read");
      if (denied) return denied;
      return json(ok({
        medicalRevenueRatio: computeMedicalRevenueRatioV13(records),
        drugRatio: computeDrugRatioV13(records),
        consumableRatio: computeConsumableRatioV13(records),
      }));
    },
  },
];

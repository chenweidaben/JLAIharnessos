/**
 * 健澜科技 jlmedaios - 业务收入结构 V13 路由（M345-B，stats 避让已有 revenueStructureV13）
 *
 * GET /api/v1/revenue-structure-stats
 *
 * 权限：revenue-structure-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeInpatientRevenueV13,
  computeOutpatientRevenueV13,
  type RevenueStructureRecordV13,
} from "../aggregators/revenueStructureStatsV13Aggregator.js";

const records: RevenueStructureRecordV13[] = [
  { outpatientRevenue: 300, inpatientRevenue: 200, drugRevenue: 200, consumableRevenue: 60 },
  { outpatientRevenue: 200, inpatientRevenue: 300, drugRevenue: 100, consumableRevenue: 40 },
];

export const revenueStructureStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/revenue-structure-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "revenue-structure-stats:read");
      if (denied) return denied;
      return json(ok({
        outpatientRevenue: computeOutpatientRevenueV13(records),
        inpatientRevenue: computeInpatientRevenueV13(records),
        drugRatio: computeDrugRatioV13(records),
        consumableRatio: computeConsumableRatioV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 收入增长 V13 路由（M407-B）
 *
 * GET /api/v1/revenue-growth
 *
 * 权限：revenue-growth:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientRevenueGrowthRateV13,
  computeMedicalServiceRevenueRatioV13,
  computeOutpatientRevenueGrowthRateV13,
  type RevenueGrowthRecordV13,
} from "../aggregators/revenueGrowthV13Aggregator.js";

const records: RevenueGrowthRecordV13[] = [
  { outpatientCurrent: 1100, outpatientPrevious: 1000, inpatientCurrent: 1200, inpatientPrevious: 1000, serviceRevenue: 400, totalRevenue: 1000 },
  { outpatientCurrent: 1100, outpatientPrevious: 1000, inpatientCurrent: 1200, inpatientPrevious: 1000, serviceRevenue: 400, totalRevenue: 1000 },
];

export const revenueGrowthV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/revenue-growth",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "revenue-growth:read");
      if (denied) return denied;
      return json(ok({
        outpatientRevenueGrowthRate: computeOutpatientRevenueGrowthRateV13(records),
        inpatientRevenueGrowthRate: computeInpatientRevenueGrowthRateV13(records),
        medicalServiceRevenueRatio: computeMedicalServiceRevenueRatioV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 合理用药 V13 路由（M359-B，stats 避让已有 rationalDrugUse）
 *
 * GET /api/v1/rational-drug-use-stats
 *
 * 权限：rational-drug-use-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdjuvantDrugRevenueRatioV13,
  computeEssentialDrugCategoryRatioV13,
  computeNationalProcurementDrugRatioV13,
  type RationalDrugUseStatsRecordV13,
} from "../aggregators/rationalDrugUseStatsV13Aggregator.js";

const records: RationalDrugUseStatsRecordV13[] = [
  { essentialDrugCategory: 200, totalDrugCategory: 400, nationalProcurementEquipped: 90, nationalProcurementRequired: 100, adjuvantDrugRevenue: 50, totalDrugRevenue: 1000 },
  { essentialDrugCategory: 200, totalDrugCategory: 400, nationalProcurementEquipped: 90, nationalProcurementRequired: 100, adjuvantDrugRevenue: 50, totalDrugRevenue: 1000 },
];

export const rationalDrugUseStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rational-drug-use-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rational-drug-use-stats:read");
      if (denied) return denied;
      return json(ok({
        essentialDrugCategoryRatio: computeEssentialDrugCategoryRatioV13(records),
        nationalProcurementDrugRatio: computeNationalProcurementDrugRatioV13(records),
        adjuvantDrugRevenueRatio: computeAdjuvantDrugRevenueRatioV13(records),
      }));
    },
  },
];

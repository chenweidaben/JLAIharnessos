/**
 * 健澜科技 jlmedaios - 基本药物管理 V13 路由（M368-D，M368 收官）
 *
 * GET /api/v1/essential-drug
 *
 * 权限：essential-drug:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBiddingDrugPurchaseRateV13,
  computeEssentialDrugAvailabilityRateV13,
  computeEssentialDrugUsageRateV13,
  type EssentialDrugRecordV13,
} from "../aggregators/essentialDrugV13Aggregator.js";

const records: EssentialDrugRecordV13[] = [
  { shouldStockVariety: 400, stockedVariety: 300, essentialDrugAmount: 400000, totalDrugAmount: 1000000, biddingPurchaseAmount: 800000, totalPurchaseAmount: 1000000 },
  { shouldStockVariety: 400, stockedVariety: 300, essentialDrugAmount: 400000, totalDrugAmount: 1000000, biddingPurchaseAmount: 800000, totalPurchaseAmount: 1000000 },
];

export const essentialDrugV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/essential-drug",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "essential-drug:read");
      if (denied) return denied;
      return json(ok({
        essentialDrugAvailabilityRate: computeEssentialDrugAvailabilityRateV13(records),
        essentialDrugUsageRate: computeEssentialDrugUsageRateV13(records),
        biddingDrugPurchaseRate: computeBiddingDrugPurchaseRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 药事管理（细节）V13 路由（M418-A，detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety）
 *
 * GET /api/v1/pharmacy-mgmt-detail
 *
 * 权限：pharmacy-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugRecallComplianceRateV13,
  computeDrugSupplyTimelyRateV13,
  computePrescriptionReviewPassRateV13,
  type PharmacyMgmtDetailRecordV13,
} from "../aggregators/pharmacyMgmtDetailV13Aggregator.js";

const records: PharmacyMgmtDetailRecordV13[] = [
  { reviewQualified: 950, reviewTotal: 1000, supplyTimely: 980, supplyTotal: 1000, recallCompliant: 99, recallTotal: 100 },
  { reviewQualified: 950, reviewTotal: 1000, supplyTimely: 980, supplyTotal: 1000, recallCompliant: 99, recallTotal: 100 },
];

export const pharmacyMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        prescriptionReviewPassRate: computePrescriptionReviewPassRateV13(records),
        drugSupplyTimelyRate: computeDrugSupplyTimelyRateV13(records),
        drugRecallComplianceRate: computeDrugRecallComplianceRateV13(records),
      }));
    },
  },
];

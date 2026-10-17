/**
 * 健澜科技 jlmedaios - 处方点评统计 V13 路由（M388-A，stats 避让）
 *
 * GET /api/v1/prescription-review-stats
 *
 * 权限：prescription-review-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIrrationalPrescriptionRateV13,
  computePrescriptionReviewCountV13,
  computeSpecialPrescriptionReviewCountV13,
  type PrescriptionReviewRecordV13,
} from "../aggregators/prescriptionReviewStatsV13Aggregator.js";

const records: PrescriptionReviewRecordV13[] = [
  { reviewCount: 1000, irrationalCount: 50, specialReviewCount: 100 },
  { reviewCount: 1000, irrationalCount: 50, specialReviewCount: 100 },
];

export const prescriptionReviewStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/prescription-review-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "prescription-review-stats:read");
      if (denied) return denied;
      return json(ok({
        prescriptionReviewCount: computePrescriptionReviewCountV13(records),
        irrationalPrescriptionRate: computeIrrationalPrescriptionRateV13(records),
        specialPrescriptionReviewCount: computeSpecialPrescriptionReviewCountV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 处方点评质量管理 V13 路由（M440-A，药事管理与药学服务组）
 *
 * GET /api/v1/prescription-review-quality
 *
 * 权限：prescription-review-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePrescriptionReviewInterventionRateV13,
  computePrescriptionReviewRationalRateV13,
  computePrescriptionReviewRateV13,
  type PrescriptionReviewQualityRecordV13,
} from "../aggregators/prescriptionReviewQualityV13Aggregator.js";

const records: PrescriptionReviewQualityRecordV13[] = [
  { reviewedPrescription: 950, sampledPrescription: 1000, rationalPrescription: 900, reviewedTotal: 1000, intervenedUnqualified: 950, totalUnqualified: 1000 },
  { reviewedPrescription: 950, sampledPrescription: 1000, rationalPrescription: 900, reviewedTotal: 1000, intervenedUnqualified: 950, totalUnqualified: 1000 },
];

export const prescriptionReviewQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/prescription-review-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "prescription-review-quality:read");
      if (denied) return denied;
      return json(ok({
        prescriptionReviewRate: computePrescriptionReviewRateV13(records),
        prescriptionReviewRationalRate: computePrescriptionReviewRationalRateV13(records),
        prescriptionReviewInterventionRate: computePrescriptionReviewInterventionRateV13(records),
      }));
    },
  },
];

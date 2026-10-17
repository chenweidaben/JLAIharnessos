/**
 * 健澜科技 jlmedaios - 处方点评 V13 路由（M406-A）
 *
 * GET /api/v1/pharmacy-prescription-review
 *
 * 权限：pharmacy-prescription-review:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInappropriateMedicationPrescriptionRateV13,
  computePrescriptionReviewPassRateV13,
  computeUnreasonablePrescriptionRateV13,
  type PharmacyPrescriptionReviewRecordV13,
} from "../aggregators/pharmacyPrescriptionReviewV13Aggregator.js";

const records: PharmacyPrescriptionReviewRecordV13[] = [
  { reviewPass: 980, reviewTotal: 1000, unreasonable: 20, inappropriate: 10 },
  { reviewPass: 980, reviewTotal: 1000, unreasonable: 20, inappropriate: 10 },
];

export const pharmacyPrescriptionReviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-prescription-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-prescription-review:read");
      if (denied) return denied;
      return json(ok({
        prescriptionReviewPassRate: computePrescriptionReviewPassRateV13(records),
        unreasonablePrescriptionRate: computeUnreasonablePrescriptionRateV13(records),
        inappropriateMedicationPrescriptionRate: computeInappropriateMedicationPrescriptionRateV13(records),
      }));
    },
  },
];

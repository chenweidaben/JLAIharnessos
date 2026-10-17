/**
 * 健澜科技 jlmedaios - 临床药学 V13 路由（M380-B）
 *
 * GET /api/v1/clinical-pharmacy
 *
 * 权限：clinical-pharmacy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPharmacistRoundCountV13,
  computeMedicationOrderAuditCountV13,
  computePrescriptionReviewCountV13,
  type ClinicalPharmacyRecordV13,
} from "../aggregators/clinicalPharmacyV13Aggregator.js";

const records: ClinicalPharmacyRecordV13[] = [
  { pharmacistRoundCount: 50, prescriptionReviewCount: 300, medicationOrderAuditCount: 2000 },
  { pharmacistRoundCount: 50, prescriptionReviewCount: 300, medicationOrderAuditCount: 2000 },
];

export const clinicalPharmacyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-pharmacy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-pharmacy:read");
      if (denied) return denied;
      return json(ok({
        clinicalPharmacistRoundCount: computeClinicalPharmacistRoundCountV13(records),
        prescriptionReviewCount: computePrescriptionReviewCountV13(records),
        medicationOrderAuditCount: computeMedicationOrderAuditCountV13(records),
      }));
    },
  },
];

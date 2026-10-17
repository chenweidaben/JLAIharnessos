/**
 * 健澜科技 jlmedaios - 医废追溯管理 V13 路由（M423-D，M423 收官，换名避让旧版 infectionControlDetailV13（M418））
 *
 * GET /api/v1/medical-waste-tracking
 *
 * 权限：medical-waste-tracking:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalWasteDisposalTimelyRateV13,
  computeMedicalWasteManifestComplianceRateV13,
  computeMedicalWasteTraceabilityCompleteRateV13,
  type MedicalWasteTrackingRecordV13,
} from "../aggregators/medicalWasteTrackingV13Aggregator.js";

const records: MedicalWasteTrackingRecordV13[] = [
  { traceComplete: 980, wasteTotal: 1000, manifestCompliant: 990, manifestTotal: 1000, timelyDisposal: 970 },
  { traceComplete: 980, wasteTotal: 1000, manifestCompliant: 990, manifestTotal: 1000, timelyDisposal: 970 },
];

export const medicalWasteTrackingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-waste-tracking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-waste-tracking:read");
      if (denied) return denied;
      return json(ok({
        medicalWasteTraceabilityCompleteRate: computeMedicalWasteTraceabilityCompleteRateV13(records),
        medicalWasteManifestComplianceRate: computeMedicalWasteManifestComplianceRateV13(records),
        medicalWasteDisposalTimelyRate: computeMedicalWasteDisposalTimelyRateV13(records),
      }));
    },
  },
];

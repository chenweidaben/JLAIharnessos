/**
 * 健澜科技 jlmedaios - 门诊药房 V13 路由（M390-C）
 *
 * GET /api/v1/outpatient-pharmacy
 *
 * 权限：outpatient-pharmacy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientMedicationConsultationCountV13,
  computeOutpatientPrescriptionDispenseCountV13,
  computePrescriptionDispenseTimeAvgV13,
  type OutpatientPharmacyRecordV13,
} from "../aggregators/outpatientPharmacyV13Aggregator.js";

const records: OutpatientPharmacyRecordV13[] = [
  { dispenseCount: 1000, totalDispenseMinutes: 6000, consultationCount: 100 },
  { dispenseCount: 1000, totalDispenseMinutes: 6000, consultationCount: 100 },
];

export const outpatientPharmacyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-pharmacy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-pharmacy:read");
      if (denied) return denied;
      return json(ok({
        outpatientPrescriptionDispenseCount: computeOutpatientPrescriptionDispenseCountV13(records),
        prescriptionDispenseTimeAvg: computePrescriptionDispenseTimeAvgV13(records),
        outpatientMedicationConsultationCount: computeOutpatientMedicationConsultationCountV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 患者安全管理 V13 路由（M418-D，M418 收官）
 *
 * GET /api/v1/patient-safety-mgmt
 *
 * 权限：patient-safety-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFallBedInjuryOccurrenceRateV13,
  computeMedicationErrorOccurrenceRateV13,
  computePatientIdentificationCorrectRateV13,
  type PatientSafetyMgmtRecordV13,
} from "../aggregators/patientSafetyMgmtV13Aggregator.js";

const records: PatientSafetyMgmtRecordV13[] = [
  { correct: 990, identifyTotal: 1000, medicationError: 5, medicationTotal: 10000, fallBedInjury: 2, inpatientCaseTotal: 10000 },
  { correct: 990, identifyTotal: 1000, medicationError: 5, medicationTotal: 10000, fallBedInjury: 2, inpatientCaseTotal: 10000 },
];

export const patientSafetyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-safety-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-safety-mgmt:read");
      if (denied) return denied;
      return json(ok({
        patientIdentificationCorrectRate: computePatientIdentificationCorrectRateV13(records),
        medicationErrorOccurrenceRate: computeMedicationErrorOccurrenceRateV13(records),
        fallBedInjuryOccurrenceRate: computeFallBedInjuryOccurrenceRateV13(records),
      }));
    },
  },
];

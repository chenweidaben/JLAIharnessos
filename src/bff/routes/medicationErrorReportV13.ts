/**
 * 健澜科技 jlmedaios - 用药错误上报 V13 路由（M424-A，换名避让旧版 patientSafetyMgmtV13（M418））
 *
 * GET /api/v1/medication-error-report
 *
 * 权限：medication-error-report:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicationErrorMissingReportRateV13,
  computeMedicationErrorReportRateV13,
  computeMedicationErrorRootCauseAnalysisRateV13,
  type MedicationErrorReportRecordV13,
} from "../aggregators/medicationErrorReportV13Aggregator.js";

const records: MedicationErrorReportRecordV13[] = [
  { reported: 95, actualTotal: 100, missing: 5, rcaCompleted: 90, errorTotal: 100 },
  { reported: 95, actualTotal: 100, missing: 5, rcaCompleted: 90, errorTotal: 100 },
];

export const medicationErrorReportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medication-error-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medication-error-report:read");
      if (denied) return denied;
      return json(ok({
        medicationErrorReportRate: computeMedicationErrorReportRateV13(records),
        medicationErrorMissingReportRate: computeMedicationErrorMissingReportRateV13(records),
        medicationErrorRootCauseAnalysisRate: computeMedicationErrorRootCauseAnalysisRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 用药安全 V13 路由（M394-D，M394 收官）
 *
 * GET /api/v1/medication-safety
 *
 * 权限：medication-safety:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHighAlertDrugMgmtRateV13,
  computeMedicationErrorRateV13,
  computeMedicationErrorReportRateV13,
  type MedicationSafetyRecordV13,
} from "../aggregators/medicationSafetyV13Aggregator.js";

const records: MedicationSafetyRecordV13[] = [
  { errorCount: 2, administrationCount: 1000, managedDrugCount: 90, highAlertDrugCount: 100, reportedCount: 1, totalErrorCount: 2 },
  { errorCount: 2, administrationCount: 1000, managedDrugCount: 90, highAlertDrugCount: 100, reportedCount: 1, totalErrorCount: 2 },
];

export const medicationSafetyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medication-safety",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medication-safety:read");
      if (denied) return denied;
      return json(ok({
        medicationErrorRate: computeMedicationErrorRateV13(records),
        highAlertDrugMgmtRate: computeHighAlertDrugMgmtRateV13(records),
        medicationErrorReportRate: computeMedicationErrorReportRateV13(records),
      }));
    },
  },
];

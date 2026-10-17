/**
 * 健澜科技 jlmedaios - 急诊分级 V13 路由（M390-D，M390 收官）
 *
 * GET /api/v1/emergency-severity
 *
 * 权限：emergency-severity:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyObservationCountV13,
  computeEmergencyVisitCountV13,
  computeRescueSuccessRateV13,
  type EmergencySeverityRecordV13,
} from "../aggregators/emergencySeverityV13Aggregator.js";

const records: EmergencySeverityRecordV13[] = [
  { visitCount: 1000, successCount: 950, rescueTotalCount: 1000, observationCount: 100 },
  { visitCount: 1000, successCount: 950, rescueTotalCount: 1000, observationCount: 100 },
];

export const emergencySeverityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-severity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-severity:read");
      if (denied) return denied;
      return json(ok({
        emergencyVisitCount: computeEmergencyVisitCountV13(records),
        rescueSuccessRate: computeRescueSuccessRateV13(records),
        emergencyObservationCount: computeEmergencyObservationCountV13(records),
      }));
    },
  },
];

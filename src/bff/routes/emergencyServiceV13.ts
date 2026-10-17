/**
 * 健澜科技 jlmedaios - 急诊服务 V13 路由（M372-B）
 *
 * GET /api/v1/emergency-service
 *
 * 权限：emergency-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyCountV13,
  computeEmergencyObservationRateV13,
  computeEmergencyRescueSuccessRateV13,
  type EmergencyServiceRecordV13,
} from "../aggregators/emergencyServiceV13Aggregator.js";

const records: EmergencyServiceRecordV13[] = [
  { emergencyCount: 500, observationCount: 50, rescueCount: 100, rescueSuccessCount: 95 },
  { emergencyCount: 500, observationCount: 50, rescueCount: 100, rescueSuccessCount: 95 },
];

export const emergencyServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-service:read");
      if (denied) return denied;
      return json(ok({
        emergencyCount: computeEmergencyCountV13(records),
        emergencyObservationRate: computeEmergencyObservationRateV13(records),
        emergencyRescueSuccessRate: computeEmergencyRescueSuccessRateV13(records),
      }));
    },
  },
];

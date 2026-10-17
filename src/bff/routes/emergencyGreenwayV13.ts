/**
 * 健澜科技 jlmedaios - 急诊绿色通道 V13 路由（M348-A）
 *
 * GET /api/v1/emergency-greenway
 *
 * 权限：emergency-greenway:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgStayMinutesV13,
  computeGreenwayPatientCountV13,
  computeRescueSuccessRateV13,
  type EmergencyGreenwayRecordV13,
} from "../aggregators/emergencyGreenwayV13Aggregator.js";

const records: EmergencyGreenwayRecordV13[] = [
  { greenwayCount: 50, stayMinutes: 30, rescueSuccessCount: 48, rescueTotalCount: 50 },
  { greenwayCount: 50, stayMinutes: 40, rescueSuccessCount: 47, rescueTotalCount: 50 },
];

export const emergencyGreenwayV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-greenway",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-greenway:read");
      if (denied) return denied;
      return json(ok({
        greenwayCount: computeGreenwayPatientCountV13(records),
        avgStayMinutes: computeAvgStayMinutesV13(records),
        rescueSuccessRate: computeRescueSuccessRateV13(records),
      }));
    },
  },
];

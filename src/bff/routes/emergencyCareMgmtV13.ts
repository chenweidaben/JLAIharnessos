/**
 * 健澜科技 jlmedaios - 急诊护理管理 V13 路由（M428-C，换名避让旧版 emergencyMgmtV13（M416，-care 后缀））
 *
 * GET /api/v1/emergency-care-mgmt
 *
 * 权限：emergency-care-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyRescueSuccessRateV13,
  computeEmergencyStayHoursV13,
  computeEmergencyTriageAccuracyRateV13,
  type EmergencyCareMgmtRecordV13,
} from "../aggregators/emergencyCareMgmtV13Aggregator.js";

const records: EmergencyCareMgmtRecordV13[] = [
  { stayHours: 3.5, rescueSuccess: 95, rescueTotal: 100, triageAccurate: 98, triageTotal: 100 },
  { stayHours: 4.3, rescueSuccess: 95, rescueTotal: 100, triageAccurate: 98, triageTotal: 100 },
];

export const emergencyCareMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-care-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-care-mgmt:read");
      if (denied) return denied;
      return json(ok({
        emergencyStayHours: computeEmergencyStayHoursV13(records),
        emergencyRescueSuccessRate: computeEmergencyRescueSuccessRateV13(records),
        emergencyTriageAccuracyRate: computeEmergencyTriageAccuracyRateV13(records),
      }));
    },
  },
];

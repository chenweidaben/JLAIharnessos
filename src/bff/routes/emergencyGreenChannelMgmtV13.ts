/**
 * 健澜科技 jlmedaios - 急诊绿色通道管理 V13 路由（M454-B，门急诊与手术麻醉管理组）
 *
 * GET /api/v1/emergency-green-channel-mgmt
 *
 * 权限：emergency-green-channel-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyGreenChannelAcceptanceTimelinessRateV13,
  computeEmergencyGreenChannelObservationHoursV13,
  computeEmergencyGreenChannelRescueSuccessRateV13,
  type EmergencyGreenChannelMgmtRecordV13,
} from "../aggregators/emergencyGreenChannelMgmtV13Aggregator.js";

const records: EmergencyGreenChannelMgmtRecordV13[] = [
  { timely: 950, total: 1000, success: 900, totalRescue: 1000, observationHours: 2.3 },
  { timely: 950, total: 1000, success: 900, totalRescue: 1000, observationHours: 3.2 },
];

export const emergencyGreenChannelMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-green-channel-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-green-channel-mgmt:read");
      if (denied) return denied;
      return json(ok({
        emergencyGreenChannelAcceptanceTimelinessRate: computeEmergencyGreenChannelAcceptanceTimelinessRateV13(records),
        emergencyGreenChannelRescueSuccessRate: computeEmergencyGreenChannelRescueSuccessRateV13(records),
        emergencyGreenChannelObservationHours: computeEmergencyGreenChannelObservationHoursV13(records),
      }));
    },
  },
];

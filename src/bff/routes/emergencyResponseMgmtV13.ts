/**
 * 健澜科技 jlmedaios - 突发事件处置管理 V13 路由（M447-B，应急管理与安全生产管理组）
 *
 * GET /api/v1/emergency-response-mgmt
 *
 * 权限：emergency-response-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyResponseClosedLoopRateV13,
  computeEmergencyResponsePostEvaluationRateV13,
  computeEmergencyResponseTimelinessRateV13,
  type EmergencyResponseMgmtRecordV13,
} from "../aggregators/emergencyResponseMgmtV13Aggregator.js";

const records: EmergencyResponseMgmtRecordV13[] = [
  { timelyResponse: 950, totalEvent: 1000, closedLoop: 900, evaluated: 980, shouldEvaluate: 1000 },
  { timelyResponse: 950, totalEvent: 1000, closedLoop: 900, evaluated: 980, shouldEvaluate: 1000 },
];

export const emergencyResponseMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-response-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-response-mgmt:read");
      if (denied) return denied;
      return json(ok({
        emergencyResponseTimelinessRate: computeEmergencyResponseTimelinessRateV13(records),
        emergencyResponseClosedLoopRate: computeEmergencyResponseClosedLoopRateV13(records),
        emergencyResponsePostEvaluationRate: computeEmergencyResponsePostEvaluationRateV13(records),
      }));
    },
  },
];

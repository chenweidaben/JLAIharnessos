/**
 * 健澜科技 jlmedaios - 治安保卫 V13 路由（M408-D，M408 收官）
 *
 * GET /api/v1/security-mgmt
 *
 * 权限：security-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyResponseTimeV13,
  computeSecurityPatrolArrivalRateV13,
  computeSurveillanceCoverageRateV13,
  type SecurityMgmtRecordV13,
} from "../aggregators/securityMgmtV13Aggregator.js";

const records: SecurityMgmtRecordV13[] = [
  { arrived: 980, should: 1000, covered: 990, shouldCover: 1000, responseMinutes: 3.5 },
  { arrived: 980, should: 1000, covered: 990, shouldCover: 1000, responseMinutes: 3.5 },
];

export const securityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/security-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-mgmt:read");
      if (denied) return denied;
      return json(ok({
        securityPatrolArrivalRate: computeSecurityPatrolArrivalRateV13(records),
        surveillanceCoverageRate: computeSurveillanceCoverageRateV13(records),
        emergencyResponseTime: computeEmergencyResponseTimeV13(records),
      }));
    },
  },
];

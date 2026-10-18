/**
 * 健澜科技 jlmedaios - 治安保卫质量管理 V13 路由（M431-D，M431 收官，-quality 后缀避让旧版 securityMgmtV13（M408））
 *
 * GET /api/v1/security-quality-mgmt
 *
 * 权限：security-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSecurityIncidentCountV13,
  computeSecurityPatrolArrivalRateV13,
  computeSecuritySurveillanceCompletenessRateV13,
  type SecurityQualityMgmtRecordV13,
} from "../aggregators/securityQualityMgmtV13Aggregator.js";

const records: SecurityQualityMgmtRecordV13[] = [
  { incidentCount: 2, patrolArrived: 950, patrolTotal: 1000, surveillanceIntact: 980, surveillanceTotal: 1000 },
  { incidentCount: 2, patrolArrived: 950, patrolTotal: 1000, surveillanceIntact: 980, surveillanceTotal: 1000 },
];

export const securityQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/security-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        securityIncidentCount: computeSecurityIncidentCountV13(records),
        securityPatrolArrivalRate: computeSecurityPatrolArrivalRateV13(records),
        securitySurveillanceCompletenessRate: computeSecuritySurveillanceCompletenessRateV13(records),
      }));
    },
  },
];

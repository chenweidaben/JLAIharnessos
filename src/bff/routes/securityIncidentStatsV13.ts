/**
 * 健澜科技 jlmedaios - 安全事件统计 V13 路由（M379-A，stats 避让）
 *
 * GET /api/v1/security-incident-stats
 *
 * 权限：security-incident-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgResponseTimeHoursV13,
  computeIncidentResolutionRateV13,
  computeSecurityIncidentCountV13,
  type SecurityIncidentRecordV13,
} from "../aggregators/securityIncidentStatsV13Aggregator.js";

const records: SecurityIncidentRecordV13[] = [
  { incidentCount: 10, responseHours: 24, resolvedCount: 9 },
  { incidentCount: 10, responseHours: 24, resolvedCount: 9 },
];

export const securityIncidentStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/security-incident-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-incident-stats:read");
      if (denied) return denied;
      return json(ok({
        securityIncidentCount: computeSecurityIncidentCountV13(records),
        avgResponseTimeHours: computeAvgResponseTimeHoursV13(records),
        incidentResolutionRate: computeIncidentResolutionRateV13(records),
      }));
    },
  },
];

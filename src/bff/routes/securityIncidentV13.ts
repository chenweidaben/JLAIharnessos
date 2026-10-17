/**
 * 健澜科技 jlmedaios - 信息安全事件 V13 路由（M344-B）
 *
 * GET /api/v1/security-incident
 *
 * 权限：security-incident:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgResponseMinutesV13,
  computeSevereIncidentCountV13,
  computeTotalIncidentCountV13,
  type SecurityIncidentRecordV13,
} from "../aggregators/securityIncidentV13Aggregator.js";

const records: SecurityIncidentRecordV13[] = [
  { severity: "severe", responseMinutes: 5 },
  { severity: "moderate", responseMinutes: 10 },
  { severity: "severe", responseMinutes: 15 },
];

export const securityIncidentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/security-incident",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-incident:read");
      if (denied) return denied;
      return json(ok({
        totalIncidentCount: computeTotalIncidentCountV13(records),
        severeIncidentCount: computeSevereIncidentCountV13(records),
        avgResponseMinutes: computeAvgResponseMinutesV13(records),
      }));
    },
  },
];

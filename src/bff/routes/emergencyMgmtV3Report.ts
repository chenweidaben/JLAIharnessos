/**
 * 健澜科技 jlmedaios - 应急管理 V3 路由（M243-D）
 *
 * GET /api/v1/emergency-mgmt-v3/report
 *
 * 权限：emergency-mgmt-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEmergencyMgmtV3Report } from "../aggregators/emergencyMgmtV3ReportAggregator.js";

export const emergencyMgmtV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-mgmt-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-mgmt-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEmergencyMgmtV3Report(timeRange);
      return json(ok(result));
    },
  },
];

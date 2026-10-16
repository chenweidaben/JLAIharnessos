/**
 * 健澜科技 jlmedaios - 急诊 V4 路由（M251-A）
 *
 * GET /api/v1/emergency-v4/report
 *
 * 权限：emergency-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEmergencyV4Report } from "../aggregators/emergencyV4ReportAggregator.js";

export const emergencyV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEmergencyV4Report(timeRange);
      return json(ok(result));
    },
  },
];

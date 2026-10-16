/**
 * 健澜科技 jlmedaios - 危重症中心智能化 V5 路由（M263-D）
 *
 * GET /api/v1/critical-care-center-v5/report
 *
 * 权限：critical-care-center-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCriticalCareCenterV5Report } from "../aggregators/criticalCareCenterV5ReportAggregator.js";

export const criticalCareCenterV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/critical-care-center-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "critical-care-center-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCriticalCareCenterV5Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 绩效 V3 路由（M240-C）
 *
 * GET /api/v1/performance-v3/report
 *
 * 权限：performance-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPerformanceV3Report } from "../aggregators/performanceV3ReportAggregator.js";

export const performanceV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPerformanceV3Report(timeRange);
      return json(ok(result));
    },
  },
];

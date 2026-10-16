/**
 * 健澜科技 jlmedaios - 绩效 V4 路由（M250-C）
 *
 * GET /api/v1/performance-v4/report
 *
 * 权限：performance-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPerformanceV4Report } from "../aggregators/performanceV4ReportAggregator.js";

export const performanceV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPerformanceV4Report(timeRange);
      return json(ok(result));
    },
  },
];

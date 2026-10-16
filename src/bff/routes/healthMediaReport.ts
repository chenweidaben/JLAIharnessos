/**
 * 健澜科技 jlmedaios - 健康科普 路由（M236-C）
 *
 * GET /api/v1/health-media/report
 *
 * 权限：health-media:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildHealthMediaReport } from "../aggregators/healthMediaReportAggregator.js";

export const healthMediaReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-media/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-media:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildHealthMediaReport(timeRange);
      return json(ok(result));
    },
  },
];

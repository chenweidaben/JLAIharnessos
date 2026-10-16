/**
 * 健澜科技 jlmedaios - 健康科普 V3 路由（M246-C）
 *
 * GET /api/v1/health-media-v3/report
 *
 * 权限：health-media-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildHealthMediaV3Report } from "../aggregators/healthMediaV3ReportAggregator.js";

export const healthMediaV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-media-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-media-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildHealthMediaV3Report(timeRange);
      return json(ok(result));
    },
  },
];

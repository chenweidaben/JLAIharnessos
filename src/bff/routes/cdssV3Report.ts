/**
 * 健澜科技 jlmedaios - CDSS V3 路由（M238-A）
 *
 * GET /api/v1/cdss-v3/report
 *
 * 权限：cdss-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCDSSV3Report } from "../aggregators/cdssV3ReportAggregator.js";

export const cdssV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cdss-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cdss-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCDSSV3Report(timeRange);
      return json(ok(result));
    },
  },
];

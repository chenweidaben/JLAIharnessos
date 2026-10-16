/**
 * 健澜科技 jlmedaios - CDSS V4 路由（M248-A）
 *
 * GET /api/v1/cdss-v4/report
 *
 * 权限：cdss-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCDSSV4Report } from "../aggregators/cdssV4ReportAggregator.js";

export const cdssV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cdss-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cdss-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCDSSV4Report(timeRange);
      return json(ok(result));
    },
  },
];

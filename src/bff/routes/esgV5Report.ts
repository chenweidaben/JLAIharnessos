/**
 * 健澜科技 jlmedaios - ESG 与可持续发展 V5 路由（M261-D）
 *
 * GET /api/v1/esg-v5/report
 *
 * 权限：esg-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildESGV5Report } from "../aggregators/esgV5ReportAggregator.js";

export const esgV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/esg-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "esg-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildESGV5Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 区域健康大脑路由（M232-D）
 *
 * GET /api/v1/regional-brain/report
 *
 * 权限：regional-brain:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRegionalHealthBrainReport } from "../aggregators/regionalBrainReportAggregator.js";

export const regionalBrainReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/regional-brain/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "regional-brain:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildRegionalHealthBrainReport(timeRange);
      return json(ok(result));
    },
  },
];

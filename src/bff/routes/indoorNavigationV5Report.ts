/**
 * 健澜科技 jlmedaios - 院内智能导航 V5 路由（M270-A）
 *
 * GET /api/v1/indoor-navigation-v5/report
 *
 * 权限：indoor-navigation-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildIndoorNavigationV5Report } from "../aggregators/indoorNavigationV5ReportAggregator.js";

export const indoorNavigationV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/indoor-navigation-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "indoor-navigation-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildIndoorNavigationV5Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 运营驾驶舱 V4 路由（M250-A）
 *
 * GET /api/v1/ops-dashboard-v4/report
 *
 * 权限：ops-dashboard-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOpsDashboardV4Report } from "../aggregators/opsDashboardV4ReportAggregator.js";

export const opsDashboardV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ops-dashboard-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-dashboard-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOpsDashboardV4Report(timeRange);
      return json(ok(result));
    },
  },
];

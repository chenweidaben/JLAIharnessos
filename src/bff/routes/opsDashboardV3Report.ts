/**
 * 健澜科技 jlmedaios - 运营驾驶舱 V3 路由（M240-A）
 *
 * GET /api/v1/ops-dashboard-v3/report
 *
 * 权限：ops-dashboard-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOpsDashboardV3Report } from "../aggregators/opsDashboardV3ReportAggregator.js";

export const opsDashboardV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ops-dashboard-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-dashboard-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOpsDashboardV3Report(timeRange);
      return json(ok(result));
    },
  },
];

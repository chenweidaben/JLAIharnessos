/**
 * 健澜科技 jlmedaios - v4.0.0 里程碑路由（M231-D）
 *
 * GET /api/v1/v4-milestone/report
 *
 * 权限：v4-milestone:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildV4MilestoneReport } from "../aggregators/v4MilestoneReportAggregator.js";

export const v4MilestoneReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/v4-milestone/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "v4-milestone:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildV4MilestoneReport(timeRange);
      return json(ok(result));
    },
  },
];

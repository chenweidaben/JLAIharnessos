/**
 * 健澜科技 jlmedaios - 多院区一体化运行 V5 路由（M273-A）
 *
 * GET /api/v1/multi-campus-v5/report
 *
 * 权限：multi-campus-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMultiCampusV5Report } from "../aggregators/multiCampusV5ReportAggregator.js";

export const multiCampusV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/multi-campus-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "multi-campus-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMultiCampusV5Report(timeRange);
      return json(ok(result));
    },
  },
];

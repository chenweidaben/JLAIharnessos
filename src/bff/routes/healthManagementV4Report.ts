/**
 * 健澜科技 jlmedaios - 健康管理 V4 路由（M253-B）
 *
 * GET /api/v1/health-management-v4/report
 *
 * 权限：health-management-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildHealthManagementV4Report } from "../aggregators/healthManagementV4ReportAggregator.js";

export const healthManagementV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-management-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-management-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildHealthManagementV4Report(timeRange);
      return json(ok(result));
    },
  },
];

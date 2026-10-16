/**
 * 健澜科技 jlmedaios - 科研管理 V4 路由（M254-B）
 *
 * GET /api/v1/research-management-v4/report
 *
 * 权限：research-management-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildResearchManagementV4Report } from "../aggregators/researchManagementV4ReportAggregator.js";

export const researchManagementV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-management-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-management-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildResearchManagementV4Report(timeRange);
      return json(ok(result));
    },
  },
];

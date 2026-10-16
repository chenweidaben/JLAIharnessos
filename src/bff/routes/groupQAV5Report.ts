/**
 * 健澜科技 jlmedaios - 集团质控与标准统一 V5 路由（M273-C）
 *
 * GET /api/v1/group-qa-v5/report
 *
 * 权限：group-qa-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGroupQAV5Report } from "../aggregators/groupQAV5ReportAggregator.js";

export const groupQAV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/group-qa-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "group-qa-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGroupQAV5Report(timeRange);
      return json(ok(result));
    },
  },
];

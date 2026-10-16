/**
 * 健澜科技 jlmedaios - 护理 V4 路由（M252-A）
 *
 * GET /api/v1/nursing-v4/report
 *
 * 权限：nursing-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildNursingV4Report } from "../aggregators/nursingV4ReportAggregator.js";

export const nursingV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildNursingV4Report(timeRange);
      return json(ok(result));
    },
  },
];

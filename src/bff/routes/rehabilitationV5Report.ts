/**
 * 健澜科技 jlmedaios - 康复医学与日间康复 V5 路由（M272-B）
 *
 * GET /api/v1/rehabilitation-v5/report
 *
 * 权限：rehabilitation-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRehabilitationV5Report } from "../aggregators/rehabilitationV5ReportAggregator.js";

export const rehabilitationV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rehabilitation-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rehabilitation-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildRehabilitationV5Report(timeRange);
      return json(ok(result));
    },
  },
];

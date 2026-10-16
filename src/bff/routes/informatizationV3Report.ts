/**
 * 健澜科技 jlmedaios - 信息化规划 V3 路由（M244-A）
 *
 * GET /api/v1/informatization-v3/report
 *
 * 权限：informatization-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInformatizationV3Report } from "../aggregators/informatizationV3ReportAggregator.js";

export const informatizationV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/informatization-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "informatization-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInformatizationV3Report(timeRange);
      return json(ok(result));
    },
  },
];

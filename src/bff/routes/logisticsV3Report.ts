/**
 * 健澜科技 jlmedaios - 后勤保障 V3 路由（M243-A）
 *
 * GET /api/v1/logistics-v3/report
 *
 * 权限：logistics-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildLogisticsV3Report } from "../aggregators/logisticsV3ReportAggregator.js";

export const logisticsV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/logistics-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "logistics-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildLogisticsV3Report(timeRange);
      return json(ok(result));
    },
  },
];

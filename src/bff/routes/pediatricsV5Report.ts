/**
 * 健澜科技 jlmedaios - 儿科与新生儿 V5 路由（M266-A）
 *
 * GET /api/v1/pediatrics-v5/report
 *
 * 权限：pediatrics-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPediatricsV5Report } from "../aggregators/pediatricsV5ReportAggregator.js";

export const pediatricsV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pediatrics-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pediatrics-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPediatricsV5Report(timeRange);
      return json(ok(result));
    },
  },
];

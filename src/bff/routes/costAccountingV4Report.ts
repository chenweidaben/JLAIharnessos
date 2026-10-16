/**
 * 健澜科技 jlmedaios - 成本核算 V4 路由（M250-B）
 *
 * GET /api/v1/cost-accounting-v4/report
 *
 * 权限：cost-accounting-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCostAccountingV4Report } from "../aggregators/costAccountingV4ReportAggregator.js";

export const costAccountingV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cost-accounting-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cost-accounting-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCostAccountingV4Report(timeRange);
      return json(ok(result));
    },
  },
];

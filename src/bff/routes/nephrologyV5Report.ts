/**
 * 健澜科技 jlmedaios - 肾病与血液净化管理 V5 路由（M265-B）
 *
 * GET /api/v1/nephrology-v5/report
 *
 * 权限：nephrology-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildNephrologyV5Report } from "../aggregators/nephrologyV5ReportAggregator.js";

export const nephrologyV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nephrology-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nephrology-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildNephrologyV5Report(timeRange);
      return json(ok(result));
    },
  },
];

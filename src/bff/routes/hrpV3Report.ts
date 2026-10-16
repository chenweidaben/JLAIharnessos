/**
 * 健澜科技 jlmedaios - HRP V3 路由（M240-D）
 *
 * GET /api/v1/hrp-v3/report
 *
 * 权限：hrp-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildHRPV3Report } from "../aggregators/hrpV3ReportAggregator.js";

export const hrpV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hrp-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hrp-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildHRPV3Report(timeRange);
      return json(ok(result));
    },
  },
];

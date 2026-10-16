/**
 * 健澜科技 jlmedaios - 工会群团 V3 路由（M245-D）
 *
 * GET /api/v1/union-v3/report
 *
 * 权限：union-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildUnionV3Report } from "../aggregators/unionV3ReportAggregator.js";

export const unionV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/union-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "union-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildUnionV3Report(timeRange);
      return json(ok(result));
    },
  },
];

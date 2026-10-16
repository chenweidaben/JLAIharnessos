/**
 * 健澜科技 jlmedaios - 生态开放 路由（M234-D）
 *
 * GET /api/v1/ecosystem-open/report
 *
 * 权限：ecosystem-open:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEcosystemOpenReport } from "../aggregators/ecosystemOpenReportAggregator.js";

export const ecosystemOpenReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ecosystem-open/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ecosystem-open:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEcosystemOpenReport(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 行政办公 V3 路由（M245-C）
 *
 * GET /api/v1/administration-v3/report
 *
 * 权限：administration-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAdministrationV3Report } from "../aggregators/administrationV3ReportAggregator.js";

export const administrationV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/administration-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "administration-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildAdministrationV3Report(timeRange);
      return json(ok(result));
    },
  },
];

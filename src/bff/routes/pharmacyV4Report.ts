/**
 * 健澜科技 jlmedaios - 药房 V4 路由（M251-C）
 *
 * GET /api/v1/pharmacy-v4/report
 *
 * 权限：pharmacy-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPharmacyV4Report } from "../aggregators/pharmacyV4ReportAggregator.js";

export const pharmacyV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPharmacyV4Report(timeRange);
      return json(ok(result));
    },
  },
];

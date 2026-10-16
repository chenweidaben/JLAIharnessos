/**
 * 健澜科技 jlmedaios - 医保 V4 路由（M252-C）
 *
 * GET /api/v1/insurance-v4/report
 *
 * 权限：insurance-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInsuranceV4Report } from "../aggregators/insuranceV4ReportAggregator.js";

export const insuranceV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInsuranceV4Report(timeRange);
      return json(ok(result));
    },
  },
];

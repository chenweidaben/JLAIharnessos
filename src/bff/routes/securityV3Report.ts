/**
 * 健澜科技 jlmedaios - 安全保卫 V3 路由（M243-C）
 *
 * GET /api/v1/security-v3/report
 *
 * 权限：security-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSecurityV3Report } from "../aggregators/securityV3ReportAggregator.js";

export const securityV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/security-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildSecurityV3Report(timeRange);
      return json(ok(result));
    },
  },
];

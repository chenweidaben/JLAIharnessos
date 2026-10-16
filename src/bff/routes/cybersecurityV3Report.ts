/**
 * 健澜科技 jlmedaios - 网络安全 V3 路由（M244-C）
 *
 * GET /api/v1/cybersecurity-v3/report
 *
 * 权限：cybersecurity-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCybersecurityV3Report } from "../aggregators/cybersecurityV3ReportAggregator.js";

export const cybersecurityV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cybersecurity-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cybersecurity-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCybersecurityV3Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 移动医疗 V3 路由（M234-C）
 *
 * GET /api/v1/mobile-health-v3/report
 *
 * 权限：mobile-health-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMobileHealthV3Report } from "../aggregators/mobileHealthV3ReportAggregator.js";

export const mobileHealthV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/mobile-health-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "mobile-health-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMobileHealthV3Report(timeRange);
      return json(ok(result));
    },
  },
];

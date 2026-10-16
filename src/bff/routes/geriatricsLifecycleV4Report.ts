/**
 * 健澜科技 jlmedaios - 老年 V4 路由（M249-C）
 *
 * GET /api/v1/geriatrics-lifecycle-v4/report
 *
 * 权限：geriatrics-lifecycle-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGeriatricsLifecycleV4Report } from "../aggregators/geriatricsLifecycleV4ReportAggregator.js";

export const geriatricsLifecycleV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/geriatrics-lifecycle-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "geriatrics-lifecycle-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGeriatricsLifecycleV4Report(timeRange);
      return json(ok(result));
    },
  },
];

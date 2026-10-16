/**
 * 健澜科技 jlmedaios - 老年全周期 V3 路由（M239-C）
 *
 * GET /api/v1/geriatrics-lifecycle-v3/report
 *
 * 权限：geriatrics-lifecycle-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGeriatricsLifecycleV3Report } from "../aggregators/geriatricsLifecycleV3ReportAggregator.js";

export const geriatricsLifecycleV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/geriatrics-lifecycle-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "geriatrics-lifecycle-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGeriatricsLifecycleV3Report(timeRange);
      return json(ok(result));
    },
  },
];

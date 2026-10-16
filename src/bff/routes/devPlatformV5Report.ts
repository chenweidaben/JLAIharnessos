/**
 * 健澜科技 jlmedaios - 医院开发者平台 V5 路由（M260-D）
 *
 * GET /api/v1/dev-platform-v5/report
 *
 * 权限：dev-platform-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDevPlatformV5Report } from "../aggregators/devPlatformV5ReportAggregator.js";

export const devPlatformV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dev-platform-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dev-platform-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDevPlatformV5Report(timeRange);
      return json(ok(result));
    },
  },
];

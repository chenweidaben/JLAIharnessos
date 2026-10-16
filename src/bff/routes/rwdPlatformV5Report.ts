/**
 * 健澜科技 jlmedaios - 临床研究 RWD/RWE 平台 V5 路由（M269-A）
 *
 * GET /api/v1/rwd-platform-v5/report
 *
 * 权限：rwd-platform-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRWDPlatformV5Report } from "../aggregators/rwdPlatformV5ReportAggregator.js";

export const rwdPlatformV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rwd-platform-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rwd-platform-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildRWDPlatformV5Report(timeRange);
      return json(ok(result));
    },
  },
];

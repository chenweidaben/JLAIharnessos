/**
 * 健澜科技 jlmedaios - 互联互通标准化成熟度 V5 路由（M267-C）
 *
 * GET /api/v1/interop-v5/report
 *
 * 权限：interop-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInteropV5Report } from "../aggregators/interopV5ReportAggregator.js";

export const interopV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/interop-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "interop-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInteropV5Report(timeRange);
      return json(ok(result));
    },
  },
];

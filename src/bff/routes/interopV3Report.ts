/**
 * 健澜科技 jlmedaios - 互联互通 V3 路由（M231-B）
 *
 * GET /api/v1/interop-v3/report
 *
 * 权限：interop-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInteropV3Report } from "../aggregators/interopV3ReportAggregator.js";

export const interopV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/interop-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "interop-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInteropV3Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 5G与边缘计算 V5 路由（M268-C）
 *
 * GET /api/v1/5g-edge-v5/report
 *
 * 权限：5g-edge-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { build5GEdgeV5Report } from "../aggregators/edgeV5ReportAggregator.js";

export const edgeV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/5g-edge-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "5g-edge-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = build5GEdgeV5Report(timeRange);
      return json(ok(result));
    },
  },
];

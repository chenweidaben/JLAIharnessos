/**
 * 健澜科技 jlmedaios - 运维管理 V3 路由（M244-D）
 *
 * GET /api/v1/ops-v3/report
 *
 * 权限：ops-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOpsV3Report } from "../aggregators/opsV3ReportAggregator.js";

export const opsV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ops-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOpsV3Report(timeRange);
      return json(ok(result));
    },
  },
];

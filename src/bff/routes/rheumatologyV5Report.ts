/**
 * 健澜科技 jlmedaios - 风湿免疫与过敏性疾病 V5 路由（M265-C）
 *
 * GET /api/v1/rheumatology-v5/report
 *
 * 权限：rheumatology-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRheumatologyV5Report } from "../aggregators/rheumatologyV5ReportAggregator.js";

export const rheumatologyV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rheumatology-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rheumatology-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildRheumatologyV5Report(timeRange);
      return json(ok(result));
    },
  },
];

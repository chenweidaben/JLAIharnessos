/**
 * 健澜科技 jlmedaios - 呼吸系统疾病管理 V5 路由（M264-C）
 *
 * GET /api/v1/pulmonology-v5/report
 *
 * 权限：pulmonology-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPulmonologyV5Report } from "../aggregators/pulmonologyV5ReportAggregator.js";

export const pulmonologyV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pulmonology-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pulmonology-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPulmonologyV5Report(timeRange);
      return json(ok(result));
    },
  },
];

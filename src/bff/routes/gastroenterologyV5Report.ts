/**
 * 健澜科技 jlmedaios - 消化系统疾病管理 V5 路由（M265-A）
 *
 * GET /api/v1/gastroenterology-v5/report
 *
 * 权限：gastroenterology-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGastroenterologyV5Report } from "../aggregators/gastroenterologyV5ReportAggregator.js";

export const gastroenterologyV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/gastroenterology-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "gastroenterology-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGastroenterologyV5Report(timeRange);
      return json(ok(result));
    },
  },
];

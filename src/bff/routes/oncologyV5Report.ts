/**
 * 健澜科技 jlmedaios - 肿瘤全程管理 V5 路由（M264-A）
 *
 * GET /api/v1/oncology-v5/report
 *
 * 权限：oncology-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOncologyV5Report } from "../aggregators/oncologyV5ReportAggregator.js";

export const oncologyV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/oncology-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "oncology-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOncologyV5Report(timeRange);
      return json(ok(result));
    },
  },
];

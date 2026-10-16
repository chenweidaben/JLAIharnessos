/**
 * 健澜科技 jlmedaios - 国考绩效 55 指标 V5 路由（M267-A）
 *
 * GET /api/v1/national-exam-v5/report
 *
 * 权限：national-exam-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildNationalExamV5Report } from "../aggregators/nationalExamV5ReportAggregator.js";

export const nationalExamV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/national-exam-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "national-exam-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildNationalExamV5Report(timeRange);
      return json(ok(result));
    },
  },
];

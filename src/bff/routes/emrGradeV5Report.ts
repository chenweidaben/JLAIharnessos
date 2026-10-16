/**
 * 健澜科技 jlmedaios - 电子病历分级评价 0-8 级 V5 路由（M267-B）
 *
 * GET /api/v1/emr-grade-v5/report
 *
 * 权限：emr-grade-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEMRGradeV5Report } from "../aggregators/emrGradeV5ReportAggregator.js";

export const emrGradeV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-grade-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-grade-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEMRGradeV5Report(timeRange);
      return json(ok(result));
    },
  },
];

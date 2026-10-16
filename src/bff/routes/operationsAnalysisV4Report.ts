/**
 * 健澜科技 jlmedaios - 运营分析 V4 路由（M254-A）
 *
 * GET /api/v1/operations-analysis-v4/report
 *
 * 权限：operations-analysis-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOperationsAnalysisV4Report } from "../aggregators/operationsAnalysisV4ReportAggregator.js";

export const operationsAnalysisV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operations-analysis-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operations-analysis-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOperationsAnalysisV4Report(timeRange);
      return json(ok(result));
    },
  },
];

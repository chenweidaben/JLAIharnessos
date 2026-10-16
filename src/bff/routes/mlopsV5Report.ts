/**
 * 健澜科技 jlmedaios - MLOps 模型工程 V5 路由（M260-A）
 *
 * GET /api/v1/mlops-v5/report
 *
 * 权限：mlops-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMLOpsV5Report } from "../aggregators/mlopsV5ReportAggregator.js";

export const mlopsV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/mlops-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "mlops-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMLOpsV5Report(timeRange);
      return json(ok(result));
    },
  },
];

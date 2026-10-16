/**
 * 健澜科技 jlmedaios - 药物临床试验 GCP V5 路由（M269-B）
 *
 * GET /api/v1/gcp-v5/report
 *
 * 权限：gcp-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGCPV5Report } from "../aggregators/gcpV5ReportAggregator.js";

export const gcpV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/gcp-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "gcp-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGCPV5Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 病历智能 V4 路由（M248-C）
 *
 * GET /api/v1/emr-intelligent-v4/report
 *
 * 权限：emr-intelligent-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEMRIntelligentV4Report } from "../aggregators/emrIntelligentV4ReportAggregator.js";

export const emrIntelligentV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-intelligent-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-intelligent-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEMRIntelligentV4Report(timeRange);
      return json(ok(result));
    },
  },
];

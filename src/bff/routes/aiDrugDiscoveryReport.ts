/**
 * 健澜科技 jlmedaios - AI 药物研发 路由（M237-A）
 *
 * GET /api/v1/ai-drug/report
 *
 * 权限：ai-drug:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAIDrugDiscoveryReport } from "../aggregators/aiDrugDiscoveryReportAggregator.js";

export const aiDrugDiscoveryReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-drug/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-drug:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildAIDrugDiscoveryReport(timeRange);
      return json(ok(result));
    },
  },
];

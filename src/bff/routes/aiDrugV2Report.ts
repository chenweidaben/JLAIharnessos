/**
 * 健澜科技 jlmedaios - AI 药物 V2 路由（M247-A）
 *
 * GET /api/v1/ai-drug-v2/report
 *
 * 权限：ai-drug-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAIDrugV2Report } from "../aggregators/aiDrugV2ReportAggregator.js";

export const aiDrugV2ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-drug-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-drug-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildAIDrugV2Report(timeRange);
      return json(ok(result));
    },
  },
];

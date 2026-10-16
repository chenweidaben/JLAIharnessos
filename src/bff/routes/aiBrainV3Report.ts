/**
 * 健澜科技 jlmedaios - AI 大脑 V3 路由（M232-A）
 *
 * GET /api/v1/ai-brain-v3/report
 *
 * 权限：ai-brain-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAIBrainV3Report } from "../aggregators/aiBrainV3ReportAggregator.js";

export const aiBrainV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-brain-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-brain-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildAIBrainV3Report(timeRange);
      return json(ok(result));
    },
  },
];

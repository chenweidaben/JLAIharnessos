/**
 * 健澜科技 jlmedaios - AI 大脑 3.0 V5 路由（M257-C）
 *
 * GET /api/v1/ai-brain-v5/report
 *
 * 权限：ai-brain-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAIBrainV5Report } from "../aggregators/aiBrainV5ReportAggregator.js";

export const aiBrainV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-brain-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-brain-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildAIBrainV5Report(timeRange);
      return json(ok(result));
    },
  },
];

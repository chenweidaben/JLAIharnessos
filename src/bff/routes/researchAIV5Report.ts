/**
 * 健澜科技 jlmedaios - AI 科研助手 V5 路由（M259-A）
 *
 * GET /api/v1/research-ai-v5/report
 *
 * 权限：research-ai-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildResearchAIV5Report } from "../aggregators/researchAIV5ReportAggregator.js";

export const researchAIV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-ai-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-ai-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildResearchAIV5Report(timeRange);
      return json(ok(result));
    },
  },
];

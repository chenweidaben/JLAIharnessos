/**
 * 健澜科技 jlmedaios - AI 教学助手 V5 路由（M259-B）
 *
 * GET /api/v1/teaching-ai-v5/report
 *
 * 权限：teaching-ai-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTeachingAIV5Report } from "../aggregators/teachingAIV5ReportAggregator.js";

export const teachingAIV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-ai-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-ai-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildTeachingAIV5Report(timeRange);
      return json(ok(result));
    },
  },
];

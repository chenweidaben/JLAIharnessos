/**
 * 健澜科技 jlmedaios - AI 手术全流程闭环 V5 路由（M258-C）
 *
 * GET /api/v1/surgery-ai-loop-v5/report
 *
 * 权限：surgery-ai-loop-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSurgeryAIClosedLoopV5Report } from "../aggregators/surgeryAIClosedLoopV5ReportAggregator.js";

export const surgeryAIClosedLoopV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/surgery-ai-loop-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "surgery-ai-loop-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildSurgeryAIClosedLoopV5Report(timeRange);
      return json(ok(result));
    },
  },
];

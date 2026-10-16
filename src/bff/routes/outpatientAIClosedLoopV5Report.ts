/**
 * 健澜科技 jlmedaios - AI 门诊全流程闭环 V5 路由（M258-A）
 *
 * GET /api/v1/outpatient-ai-loop-v5/report
 *
 * 权限：outpatient-ai-loop-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOutpatientAIClosedLoopV5Report } from "../aggregators/outpatientAIClosedLoopV5ReportAggregator.js";

export const outpatientAIClosedLoopV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-ai-loop-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-ai-loop-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOutpatientAIClosedLoopV5Report(timeRange);
      return json(ok(result));
    },
  },
];

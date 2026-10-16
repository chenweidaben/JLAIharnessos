/**
 * 健澜科技 jlmedaios - AI 住院全流程闭环 V5 路由（M258-B）
 *
 * GET /api/v1/inpatient-ai-loop-v5/report
 *
 * 权限：inpatient-ai-loop-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInpatientAIClosedLoopV5Report } from "../aggregators/inpatientAIClosedLoopV5ReportAggregator.js";

export const inpatientAIClosedLoopV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-ai-loop-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-ai-loop-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInpatientAIClosedLoopV5Report(timeRange);
      return json(ok(result));
    },
  },
];

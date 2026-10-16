/**
 * 健澜科技 jlmedaios - AI 辅助诊断 V3 路由（M255-A）
 *
 * GET /api/v1/ai-diagnosis-v3/report
 *
 * 权限：ai-diagnosis-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAIDiagnosisV3Report } from "../aggregators/aiDiagnosisV3ReportAggregator.js";

export const aiDiagnosisV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-diagnosis-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-diagnosis-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildAIDiagnosisV3Report(timeRange);
      return json(ok(result));
    },
  },
];

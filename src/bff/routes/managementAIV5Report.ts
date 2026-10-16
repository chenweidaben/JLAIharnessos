/**
 * 健澜科技 jlmedaios - AI 管理决策助手 V5 路由（M259-D）
 *
 * GET /api/v1/management-ai-v5/report
 *
 * 权限：management-ai-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildManagementAIV5Report } from "../aggregators/managementAIV5ReportAggregator.js";

export const managementAIV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/management-ai-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "management-ai-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildManagementAIV5Report(timeRange);
      return json(ok(result));
    },
  },
];

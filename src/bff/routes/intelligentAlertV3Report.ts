/**
 * 健澜科技 jlmedaios - 智能预警 V3 路由（M255-B）
 *
 * GET /api/v1/intelligent-alert-v3/report
 *
 * 权限：intelligent-alert-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildIntelligentAlertV3Report } from "../aggregators/intelligentAlertV3ReportAggregator.js";

export const intelligentAlertV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/intelligent-alert-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "intelligent-alert-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildIntelligentAlertV3Report(timeRange);
      return json(ok(result));
    },
  },
];

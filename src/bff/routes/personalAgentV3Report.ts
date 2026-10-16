/**
 * 健澜科技 jlmedaios - Personal Agent V3 路由（M232-B）
 *
 * GET /api/v1/personal-agent-v3/report
 *
 * 权限：personal-agent-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPersonalAgentV3Report } from "../aggregators/personalAgentV3ReportAggregator.js";

export const personalAgentV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/personal-agent-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "personal-agent-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPersonalAgentV3Report(timeRange);
      return json(ok(result));
    },
  },
];

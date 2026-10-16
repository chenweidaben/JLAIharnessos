/**
 * 健澜科技 jlmedaios - Personal Agent 2.0 V5 路由（M257-B）
 *
 * GET /api/v1/personal-agent-v5/report
 *
 * 权限：personal-agent-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPersonalAgentV5Report } from "../aggregators/personalAgentV5ReportAggregator.js";

export const personalAgentV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/personal-agent-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "personal-agent-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPersonalAgentV5Report(timeRange);
      return json(ok(result));
    },
  },
];

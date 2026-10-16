/**
 * 健澜科技 jlmedaios - 心理心身与 EAP V5 路由（M272-D）
 *
 * GET /api/v1/psych-eap-v5/report
 *
 * 权限：psych-eap-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPsychEAPV5Report } from "../aggregators/psychEAPV5ReportAggregator.js";

export const psychEAPV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/psych-eap-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "psych-eap-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPsychEAPV5Report(timeRange);
      return json(ok(result));
    },
  },
];

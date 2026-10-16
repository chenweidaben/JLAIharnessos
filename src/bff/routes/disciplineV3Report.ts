/**
 * 健澜科技 jlmedaios - 学科建设 V3 路由（M242-A）
 *
 * GET /api/v1/discipline-v3/report
 *
 * 权限：discipline-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDisciplineV3Report } from "../aggregators/disciplineV3ReportAggregator.js";

export const disciplineV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discipline-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discipline-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDisciplineV3Report(timeRange);
      return json(ok(result));
    },
  },
];

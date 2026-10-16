/**
 * 健澜科技 jlmedaios - 科研创新 V3 路由（M242-C）
 *
 * GET /api/v1/research-v3/report
 *
 * 权限：research-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildResearchV3Report } from "../aggregators/researchV3ReportAggregator.js";

export const researchV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildResearchV3Report(timeRange);
      return json(ok(result));
    },
  },
];

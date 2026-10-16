/**
 * 健澜科技 jlmedaios - 院感控制 V3 路由（M256-B）
 *
 * GET /api/v1/infection-control-v3/report
 *
 * 权限：infection-control-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInfectionControlV3Report } from "../aggregators/infectionControlV3ReportAggregator.js";

export const infectionControlV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infection-control-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infection-control-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInfectionControlV3Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 国际医疗 V2 路由（M236-D）
 *
 * GET /api/v1/international-health-v2/report
 *
 * 权限：international-health-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInternationalHealthV2Report } from "../aggregators/internationalHealthV2ReportAggregator.js";

export const internationalHealthV2ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/international-health-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "international-health-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInternationalHealthV2Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 数字孪生路由（M232-C）
 *
 * GET /api/v1/digital-twin/report
 *
 * 权限：digital-twin:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDigitalTwinReport } from "../aggregators/digitalTwinReportAggregator.js";

export const digitalTwinReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/digital-twin/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "digital-twin:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDigitalTwinReport(timeRange);
      return json(ok(result));
    },
  },
];

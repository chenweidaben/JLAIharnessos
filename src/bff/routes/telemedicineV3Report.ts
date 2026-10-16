/**
 * 健澜科技 jlmedaios - 远程医疗 V3 路由（M234-B）
 *
 * GET /api/v1/telemedicine-v3/report
 *
 * 权限：telemedicine-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTelemedicineV3Report } from "../aggregators/telemedicineV3ReportAggregator.js";

export const telemedicineV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/telemedicine-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "telemedicine-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildTelemedicineV3Report(timeRange);
      return json(ok(result));
    },
  },
];

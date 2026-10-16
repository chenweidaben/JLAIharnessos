/**
 * 健澜科技 jlmedaios - 互联网医院 V3 路由（M234-A）
 *
 * GET /api/v1/internet-hospital-v3/report
 *
 * 权限：internet-hospital-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInternetHospitalV3Report } from "../aggregators/internetHospitalV3ReportAggregator.js";

export const internetHospitalV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/internet-hospital-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "internet-hospital-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInternetHospitalV3Report(timeRange);
      return json(ok(result));
    },
  },
];

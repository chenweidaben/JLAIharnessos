/**
 * 健澜科技 jlmedaios - 互联网医院与处方流转 V5 路由（M262-A）
 *
 * GET /api/v1/internet-hospital-v5/report
 *
 * 权限：internet-hospital-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInternetHospitalV5Report } from "../aggregators/internetHospitalV5ReportAggregator.js";

export const internetHospitalV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/internet-hospital-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "internet-hospital-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInternetHospitalV5Report(timeRange);
      return json(ok(result));
    },
  },
];

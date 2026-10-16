/**
 * 健澜科技 jlmedaios - 医院 OS 底座 V5 路由（M257-A）
 *
 * GET /api/v1/hospital-os-v5/report
 *
 * 权限：hospital-os-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildHospitalOSV5Report } from "../aggregators/hospitalOSV5ReportAggregator.js";

export const hospitalOSV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospital-os-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospital-os-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildHospitalOSV5Report(timeRange);
      return json(ok(result));
    },
  },
];

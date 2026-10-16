/**
 * 健澜科技 jlmedaios - 绿色医院 V3 路由（M246-A）
 *
 * GET /api/v1/green-hospital-v3/report
 *
 * 权限：green-hospital-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGreenHospitalV3Report } from "../aggregators/greenHospitalV3ReportAggregator.js";

export const greenHospitalV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/green-hospital-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "green-hospital-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGreenHospitalV3Report(timeRange);
      return json(ok(result));
    },
  },
];

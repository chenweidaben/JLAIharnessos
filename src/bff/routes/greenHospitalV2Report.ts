/**
 * 健澜科技 jlmedaios - 绿色医院 V2 路由（M236-A）
 *
 * GET /api/v1/green-hospital/report
 *
 * 权限：green-hospital:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGreenHospitalV2Report } from "../aggregators/greenHospitalV2ReportAggregator.js";

export const greenHospitalV2ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/green-hospital/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "green-hospital:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGreenHospitalV2Report(timeRange);
      return json(ok(result));
    },
  },
];

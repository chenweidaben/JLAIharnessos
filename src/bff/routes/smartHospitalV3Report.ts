/**
 * 健澜科技 jlmedaios - 智慧医院 V3 路由（M231-A）
 *
 * GET /api/v1/smart-hospital-v3/report
 *
 * 权限：smart-hospital-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSmartHospitalV3Report } from "../aggregators/smartHospitalV3ReportAggregator.js";

export const smartHospitalV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/smart-hospital-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "smart-hospital-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildSmartHospitalV3Report(timeRange);
      return json(ok(result));
    },
  },
];

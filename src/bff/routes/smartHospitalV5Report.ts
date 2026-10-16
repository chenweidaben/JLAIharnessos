/**
 * 健澜科技 jlmedaios - 智慧医院三位一体评级 V5 路由（M267-D）
 *
 * GET /api/v1/smart-hospital-v5/report
 *
 * 权限：smart-hospital-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSmartHospitalV5Report } from "../aggregators/smartHospitalV5ReportAggregator.js";

export const smartHospitalV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/smart-hospital-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "smart-hospital-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildSmartHospitalV5Report(timeRange);
      return json(ok(result));
    },
  },
];

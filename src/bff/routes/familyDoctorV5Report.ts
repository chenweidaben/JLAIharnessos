/**
 * 健澜科技 jlmedaios - 家庭医生签约服务 V5 路由（M262-C）
 *
 * GET /api/v1/family-doctor-v5/report
 *
 * 权限：family-doctor-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildFamilyDoctorV5Report } from "../aggregators/familyDoctorV5ReportAggregator.js";

export const familyDoctorV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/family-doctor-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "family-doctor-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildFamilyDoctorV5Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 患者画像 V3 路由（M255-C）
 *
 * GET /api/v1/patient-profile-v3/report
 *
 * 权限：patient-profile-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPatientProfileV3Report } from "../aggregators/patientProfileV3ReportAggregator.js";

export const patientProfileV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-profile-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-profile-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPatientProfileV3Report(timeRange);
      return json(ok(result));
    },
  },
];

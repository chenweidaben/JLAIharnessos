/**
 * 健澜科技 jlmedaios - 患者安全 V3 路由（M241-A）
 *
 * GET /api/v1/patient-safety-v3/report
 *
 * 权限：patient-safety-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPatientSafetyV3Report } from "../aggregators/patientSafetyV3ReportAggregator.js";

export const patientSafetyV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-safety-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-safety-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPatientSafetyV3Report(timeRange);
      return json(ok(result));
    },
  },
];

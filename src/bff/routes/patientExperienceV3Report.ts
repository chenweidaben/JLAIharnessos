/**
 * 健澜科技 jlmedaios - 患者体验 V3 路由（M241-D）
 *
 * GET /api/v1/patient-experience-v3/report
 *
 * 权限：patient-experience-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPatientExperienceV3Report } from "../aggregators/patientExperienceV3ReportAggregator.js";

export const patientExperienceV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-experience-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-experience-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPatientExperienceV3Report(timeRange);
      return json(ok(result));
    },
  },
];

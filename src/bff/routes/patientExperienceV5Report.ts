/**
 * 健澜科技 jlmedaios - 患者体验监测与改进 V5 路由（M270-D）
 *
 * GET /api/v1/patient-experience-v5/report
 *
 * 权限：patient-experience-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPatientExperienceV5Report } from "../aggregators/patientExperienceV5ReportAggregator.js";

export const patientExperienceV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-experience-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-experience-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPatientExperienceV5Report(timeRange);
      return json(ok(result));
    },
  },
];

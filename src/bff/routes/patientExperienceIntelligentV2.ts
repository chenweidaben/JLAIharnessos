/**
 * 健澜科技 jlmedaios - 患者体验智能化 V2 路由（M235-A）
 *
 * GET /api/v1/patient-experience-ai-v2/report
 *
 * 权限：patient-experience-ai-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPatientExperienceIntelligentV2 } from "../aggregators/patientExperienceIntelligentV2Aggregator.js";

export const patientExperienceIntelligentV2Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-experience-ai-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-experience-ai-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPatientExperienceIntelligentV2(timeRange);
      return json(ok(result));
    },
  },
];

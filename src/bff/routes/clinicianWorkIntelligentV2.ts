/**
 * 健澜科技 jlmedaios - 医护工作智能化 V2 路由（M235-B）
 *
 * GET /api/v1/clinician-work-ai-v2/report
 *
 * 权限：clinician-work-ai-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildClinicianWorkIntelligentV2 } from "../aggregators/clinicianWorkIntelligentV2Aggregator.js";

export const clinicianWorkIntelligentV2Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinician-work-ai-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinician-work-ai-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildClinicianWorkIntelligentV2(timeRange);
      return json(ok(result));
    },
  },
];

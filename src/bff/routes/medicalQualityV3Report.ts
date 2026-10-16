/**
 * 健澜科技 jlmedaios - 医疗质量 V3 路由（M241-B）
 *
 * GET /api/v1/medical-quality-v3/report
 *
 * 权限：medical-quality-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMedicalQualityV3Report } from "../aggregators/medicalQualityV3ReportAggregator.js";

export const medicalQualityV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-quality-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-quality-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMedicalQualityV3Report(timeRange);
      return json(ok(result));
    },
  },
];

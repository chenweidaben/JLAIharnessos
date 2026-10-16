/**
 * 健澜科技 jlmedaios - 护理质量 V3 路由（M241-C）
 *
 * GET /api/v1/nursing-quality-v3/report
 *
 * 权限：nursing-quality-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildNursingQualityV3Report } from "../aggregators/nursingQualityV3ReportAggregator.js";

export const nursingQualityV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-quality-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-quality-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildNursingQualityV3Report(timeRange);
      return json(ok(result));
    },
  },
];

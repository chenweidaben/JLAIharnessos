/**
 * 健澜科技 jlmedaios - EMR 评级 V3 路由（M231-C）
 *
 * GET /api/v1/emr-rating-v3/report
 *
 * 权限：emr-rating-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEMRRatingV3Report } from "../aggregators/emrRatingV3ReportAggregator.js";

export const emrRatingV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-rating-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-rating-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEMRRatingV3Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 眼科耳鼻喉口腔 V5 路由（M266-D）
 *
 * GET /api/v1/ent-eye-dental-v5/report
 *
 * 权限：ent-eye-dental-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildENTEyeDentalV5Report } from "../aggregators/entEyeDentalV5ReportAggregator.js";

export const entEyeDentalV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ent-eye-dental-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ent-eye-dental-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildENTEyeDentalV5Report(timeRange);
      return json(ok(result));
    },
  },
];

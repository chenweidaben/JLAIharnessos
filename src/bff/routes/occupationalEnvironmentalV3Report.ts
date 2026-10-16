/**
 * 健澜科技 jlmedaios - 职业环境 V3 路由（M239-D）
 *
 * GET /api/v1/occupational-environmental-v3/report
 *
 * 权限：occupational-environmental-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOccupationalEnvironmentalV3Report } from "../aggregators/occupationalEnvironmentalV3ReportAggregator.js";

export const occupationalEnvironmentalV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/occupational-environmental-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "occupational-environmental-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOccupationalEnvironmentalV3Report(timeRange);
      return json(ok(result));
    },
  },
];

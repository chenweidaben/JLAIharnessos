/**
 * 健澜科技 jlmedaios - 教学培训 V3 路由（M242-D）
 *
 * GET /api/v1/teaching-v3/report
 *
 * 权限：teaching-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTeachingV3Report } from "../aggregators/teachingV3ReportAggregator.js";

export const teachingV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildTeachingV3Report(timeRange);
      return json(ok(result));
    },
  },
];

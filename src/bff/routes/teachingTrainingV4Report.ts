/**
 * 健澜科技 jlmedaios - 教学培训 V4 路由（M254-C）
 *
 * GET /api/v1/teaching-training-v4/report
 *
 * 权限：teaching-training-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTeachingTrainingV4Report } from "../aggregators/teachingTrainingV4ReportAggregator.js";

export const teachingTrainingV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-training-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-training-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildTeachingTrainingV4Report(timeRange);
      return json(ok(result));
    },
  },
];

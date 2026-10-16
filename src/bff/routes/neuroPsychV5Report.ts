/**
 * 健澜科技 jlmedaios - 神经与精神心理疾病 V5 路由（M265-D）
 *
 * GET /api/v1/neuro-psych-v5/report
 *
 * 权限：neuro-psych-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildNeuroPsychV5Report } from "../aggregators/neuroPsychV5ReportAggregator.js";

export const neuroPsychV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/neuro-psych-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "neuro-psych-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildNeuroPsychV5Report(timeRange);
      return json(ok(result));
    },
  },
];

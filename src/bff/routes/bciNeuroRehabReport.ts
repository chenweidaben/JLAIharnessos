/**
 * 健澜科技 jlmedaios - 脑机接口与神经康复 路由（M237-B）
 *
 * GET /api/v1/bci-neuro-rehab/report
 *
 * 权限：bci-neuro-rehab:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildBCINeuroRehabReport } from "../aggregators/bciNeuroRehabReportAggregator.js";

export const bciNeuroRehabReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bci-neuro-rehab/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bci-neuro-rehab:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildBCINeuroRehabReport(timeRange);
      return json(ok(result));
    },
  },
];

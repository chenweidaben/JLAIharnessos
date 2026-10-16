/**
 * 健澜科技 jlmedaios - 脑机接口 V2 路由（M247-B）
 *
 * GET /api/v1/bci-neuro-rehab-v2/report
 *
 * 权限：bci-neuro-rehab-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildBCINeuroRehabV2Report } from "../aggregators/bciNeuroRehabV2ReportAggregator.js";

export const bciNeuroRehabV2ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bci-neuro-rehab-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bci-neuro-rehab-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildBCINeuroRehabV2Report(timeRange);
      return json(ok(result));
    },
  },
];

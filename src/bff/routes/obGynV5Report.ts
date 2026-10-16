/**
 * 健澜科技 jlmedaios - 妇产科与围产 V5 路由（M266-B）
 *
 * GET /api/v1/ob-gyn-v5/report
 *
 * 权限：ob-gyn-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildObstetricsGynecologyV5Report } from "../aggregators/obstetricsGynecologyV5ReportAggregator.js";

export const obGynV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ob-gyn-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ob-gyn-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildObstetricsGynecologyV5Report(timeRange);
      return json(ok(result));
    },
  },
];

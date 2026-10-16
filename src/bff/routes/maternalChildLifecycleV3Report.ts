/**
 * 健澜科技 jlmedaios - 妇幼全周期 V3 路由（M239-B）
 *
 * GET /api/v1/maternal-child-lifecycle-v3/report
 *
 * 权限：maternal-child-lifecycle-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMaternalChildLifecycleV3Report } from "../aggregators/maternalChildLifecycleV3ReportAggregator.js";

export const maternalChildLifecycleV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/maternal-child-lifecycle-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "maternal-child-lifecycle-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMaternalChildLifecycleV3Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 创伤中心智能化 V5 路由（M263-C）
 *
 * GET /api/v1/trauma-center-v5/report
 *
 * 权限：trauma-center-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTraumaCenterV5Report } from "../aggregators/traumaCenterV5ReportAggregator.js";

export const traumaCenterV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/trauma-center-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "trauma-center-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildTraumaCenterV5Report(timeRange);
      return json(ok(result));
    },
  },
];

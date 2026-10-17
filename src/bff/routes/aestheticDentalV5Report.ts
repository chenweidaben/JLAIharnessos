/**
 * 健澜科技 jlmedaios - 医美口腔健康消费 V5 路由（M274-C）
 *
 * GET /api/v1/aesthetic-dental-v5/report
 *
 * 权限：aesthetic-dental-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildAestheticDentalV5Report } from "../aggregators/aestheticDentalV5ReportAggregator.js";

export const aestheticDentalV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/aesthetic-dental-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "aesthetic-dental-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildAestheticDentalV5Report(timeRange);
      return json(ok(result));
    },
  },
];

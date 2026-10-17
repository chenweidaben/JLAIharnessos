/**
 * 健澜科技 jlmedaios - 月子中心与产后康复 V5 路由（M274-B）
 *
 * GET /api/v1/postpartum-care-v5/report
 *
 * 权限：postpartum-care-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPostpartumCareV5Report } from "../aggregators/postpartumCareV5ReportAggregator.js";

export const postpartumCareV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/postpartum-care-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "postpartum-care-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPostpartumCareV5Report(timeRange);
      return json(ok(result));
    },
  },
];

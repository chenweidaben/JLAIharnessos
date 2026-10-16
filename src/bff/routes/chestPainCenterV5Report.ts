/**
 * 健澜科技 jlmedaios - 胸痛中心智能化 V5 路由（M263-A）
 *
 * GET /api/v1/chest-pain-center-v5/report
 *
 * 权限：chest-pain-center-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildChestPainCenterV5Report } from "../aggregators/chestPainCenterV5ReportAggregator.js";

export const chestPainCenterV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/chest-pain-center-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "chest-pain-center-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildChestPainCenterV5Report(timeRange);
      return json(ok(result));
    },
  },
];

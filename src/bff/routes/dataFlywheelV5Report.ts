/**
 * 健澜科技 jlmedaios - 数据飞轮 V5 路由（M257-D）
 *
 * GET /api/v1/data-flywheel-v5/report
 *
 * 权限：data-flywheel-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDataFlywheelV5Report } from "../aggregators/dataFlywheelV5ReportAggregator.js";

export const dataFlywheelV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-flywheel-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-flywheel-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDataFlywheelV5Report(timeRange);
      return json(ok(result));
    },
  },
];

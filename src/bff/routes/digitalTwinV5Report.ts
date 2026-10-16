/**
 * 健澜科技 jlmedaios - 数字孪生可视化 V5 路由（M268-D）
 *
 * GET /api/v1/digital-twin-v5/report
 *
 * 权限：digital-twin-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDigitalTwinV5Report } from "../aggregators/digitalTwinV5ReportAggregator.js";

export const digitalTwinV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/digital-twin-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "digital-twin-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDigitalTwinV5Report(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 后勤设备 V4 路由（M254-D）
 *
 * GET /api/v1/logistics-equipment-v4/report
 *
 * 权限：logistics-equipment-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildLogisticsEquipmentV4Report } from "../aggregators/logisticsEquipmentV4ReportAggregator.js";

export const logisticsEquipmentV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/logistics-equipment-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "logistics-equipment-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildLogisticsEquipmentV4Report(timeRange);
      return json(ok(result));
    },
  },
];

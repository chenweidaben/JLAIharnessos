/**
 * 健澜科技 jlmedaios - 设备耗材 V3 路由（M243-B）
 *
 * GET /api/v1/equipment-supply-v3/report
 *
 * 权限：equipment-supply-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEquipmentSupplyV3Report } from "../aggregators/equipmentSupplyV3ReportAggregator.js";

export const equipmentSupplyV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-supply-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-supply-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEquipmentSupplyV3Report(timeRange);
      return json(ok(result));
    },
  },
];

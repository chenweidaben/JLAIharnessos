/**
 * 健澜科技 jlmedaios - 预防公卫 V4 路由（M249-A）
 *
 * GET /api/v1/preventive-medicine-v4/report
 *
 * 权限：preventive-medicine-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPreventiveMedicineV4Report } from "../aggregators/preventiveMedicineV4ReportAggregator.js";

export const preventiveMedicineV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/preventive-medicine-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "preventive-medicine-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPreventiveMedicineV4Report(timeRange);
      return json(ok(result));
    },
  },
];

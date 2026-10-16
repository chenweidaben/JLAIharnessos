/**
 * 健澜科技 jlmedaios - 预防医学 V3 路由（M239-A）
 *
 * GET /api/v1/preventive-medicine-v3/report
 *
 * 权限：preventive-medicine-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPreventiveMedicineV3Report } from "../aggregators/preventiveMedicineV3ReportAggregator.js";

export const preventiveMedicineV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/preventive-medicine-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "preventive-medicine-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPreventiveMedicineV3Report(timeRange);
      return json(ok(result));
    },
  },
];

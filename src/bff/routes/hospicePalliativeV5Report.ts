/**
 * 健澜科技 jlmedaios - 安宁疗护与缓和医疗 V5 路由（M272-A）
 *
 * GET /api/v1/hospice-palliative-v5/report
 *
 * 权限：hospice-palliative-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildHospicePalliativeV5Report } from "../aggregators/hospicePalliativeV5ReportAggregator.js";

export const hospicePalliativeV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospice-palliative-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospice-palliative-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildHospicePalliativeV5Report(timeRange);
      return json(ok(result));
    },
  },
];

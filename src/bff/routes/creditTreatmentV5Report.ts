/**
 * 健澜科技 jlmedaios - 信用就医先诊后付 V5 路由（M271-B）
 *
 * GET /api/v1/credit-treatment-v5/report
 *
 * 权限：credit-treatment-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCreditTreatmentV5Report } from "../aggregators/creditTreatmentV5ReportAggregator.js";

export const creditTreatmentV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/credit-treatment-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "credit-treatment-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCreditTreatmentV5Report(timeRange);
      return json(ok(result));
    },
  },
];

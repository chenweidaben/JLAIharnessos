/**
 * 健澜科技 jlmedaios - 商业健康保险与惠民保 V5 路由（M262-D）
 *
 * GET /api/v1/commercial-insurance-v5/report
 *
 * 权限：commercial-insurance-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCommercialInsuranceV5Report } from "../aggregators/commercialInsuranceV5ReportAggregator.js";

export const commercialInsuranceV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/commercial-insurance-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "commercial-insurance-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCommercialInsuranceV5Report(timeRange);
      return json(ok(result));
    },
  },
];

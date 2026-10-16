/**
 * 健澜科技 jlmedaios - 价格管理与收费合规 V5 路由（M271-C）
 *
 * GET /api/v1/price-compliance-v5/report
 *
 * 权限：price-compliance-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPriceComplianceV5Report } from "../aggregators/priceComplianceV5ReportAggregator.js";

export const priceComplianceV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/price-compliance-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "price-compliance-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPriceComplianceV5Report(timeRange);
      return json(ok(result));
    },
  },
];

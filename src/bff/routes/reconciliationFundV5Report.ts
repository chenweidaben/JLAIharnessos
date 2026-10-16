/**
 * 健澜科技 jlmedaios - 对账清算与医保基金监管 V5 路由（M271-D）
 *
 * GET /api/v1/reconciliation-fund-v5/report
 *
 * 权限：reconciliation-fund-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildReconciliationFundV5Report } from "../aggregators/reconciliationFundV5ReportAggregator.js";

export const reconciliationFundV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/reconciliation-fund-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "reconciliation-fund-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildReconciliationFundV5Report(timeRange);
      return json(ok(result));
    },
  },
];

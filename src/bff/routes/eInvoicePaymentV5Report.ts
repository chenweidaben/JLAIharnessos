/**
 * 健澜科技 jlmedaios - 电子票据与移动支付 V5 路由（M271-A）
 *
 * GET /api/v1/e-invoice-payment-v5/report
 *
 * 权限：e-invoice-payment-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEInvoicePaymentV5Report } from "../aggregators/eInvoicePaymentV5ReportAggregator.js";

export const eInvoicePaymentV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/e-invoice-payment-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "e-invoice-payment-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEInvoicePaymentV5Report(timeRange);
      return json(ok(result));
    },
  },
];

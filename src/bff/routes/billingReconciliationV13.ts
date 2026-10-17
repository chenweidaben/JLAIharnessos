/**
 * 健澜科技 jlmedaios - 医保对账 V13 路由（M329-A）
 *
 * GET /api/v1/billing-reconciliation
 *
 * 权限：billing-reconciliation:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDiscrepancyRateV13,
  countDiscrepancyRecordsV13,
  countReconciliationRecordsV13,
  type ReconciliationRecordV13,
} from "../aggregators/billingReconciliationV13Aggregator.js";

const records: ReconciliationRecordV13[] = Array.from({ length: 100 }, (_, i) => ({
  recordId: `r${i + 1}`,
  hasDiscrepancy: i < 2,
}));

export const billingReconciliationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/billing-reconciliation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "billing-reconciliation:read");
      if (denied) return denied;
      const total = countReconciliationRecordsV13(records);
      const discrepancy = countDiscrepancyRecordsV13(records);
      return json(ok({
        total,
        discrepancy,
        discrepancyRate: computeDiscrepancyRateV13(total, discrepancy),
      }));
    },
  },
];

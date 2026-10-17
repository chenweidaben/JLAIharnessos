/**
 * 健澜科技 jlmedaios - 医保结算 V13 路由（M345-A，stats 避让 M329-D）
 *
 * GET /api/v1/insurance-settlement-stats
 *
 * 权限：insurance-settlement-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMonthlySettlementAmountV13,
  computeRejectionAmountV13,
  computeRejectionRateV13,
  type InsuranceSettlementRecordV13,
} from "../aggregators/insuranceSettlementStatsV13Aggregator.js";

const records: InsuranceSettlementRecordV13[] = [
  { settlementAmount: 60, rejectedAmount: 0.5 },
  { settlementAmount: 40, rejectedAmount: 0.5 },
];

export const insuranceSettlementStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-settlement-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-settlement-stats:read");
      if (denied) return denied;
      return json(ok({
        settlementAmount: computeMonthlySettlementAmountV13(records),
        rejectedAmount: computeRejectionAmountV13(records),
        rejectionRate: computeRejectionRateV13(records),
      }));
    },
  },
];

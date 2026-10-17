/**
 * 健澜科技 jlmedaios - 医保结算 V13 路由（M329-D）
 *
 * GET /api/v1/insurance-settlement
 *
 * 权限：insurance-settlement:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRejectionRateV13,
  sumRejectedAmountV13,
  sumSettlementAmountV13,
  type SettlementRecordV13,
} from "../aggregators/insuranceSettlementV13Aggregator.js";

const records: SettlementRecordV13[] = [
  { settlementAmount: 60, rejectedAmount: 1 },
  { settlementAmount: 40, rejectedAmount: 1 },
];

export const insuranceSettlementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-settlement",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-settlement:read");
      if (denied) return denied;
      const settlement = sumSettlementAmountV13(records);
      const rejected = sumRejectedAmountV13(records);
      return json(ok({
        settlement,
        rejected,
        rejectionRate: computeRejectionRateV13(settlement, rejected),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 医保结算明细 V13 路由（M375-A，避让 detail 后缀）
 *
 * GET /api/v1/insurance-settlement-detail
 *
 * 权限：insurance-settlement-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInsuranceFundExpenseV13,
  computeInsuranceSettlementCountV13,
  computePersonalOutOfPocketRatioV13,
  type InsuranceSettlementRecordV13,
} from "../aggregators/insuranceSettlementDetailV13Aggregator.js";

const records: InsuranceSettlementRecordV13[] = [
  { settlementCount: 500, fundExpense: 100000, totalCost: 100000, personalOutOfPocket: 30000 },
  { settlementCount: 500, fundExpense: 100000, totalCost: 100000, personalOutOfPocket: 30000 },
];

export const insuranceSettlementDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-settlement-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-settlement-detail:read");
      if (denied) return denied;
      return json(ok({
        insuranceSettlementCount: computeInsuranceSettlementCountV13(records),
        insuranceFundExpense: computeInsuranceFundExpenseV13(records),
        personalOutOfPocketRatio: computePersonalOutOfPocketRatioV13(records),
      }));
    },
  },
];

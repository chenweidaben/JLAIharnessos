/**
 * 健澜科技 jlmedaios - 财务明细 V13 路由（M381-B）
 *
 * GET /api/v1/finance-detail
 *
 * 权限：finance-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugRevenueRatioV13,
  computeMaterialRevenueRatioV13,
  computeMedicalRevenueRatioV13,
  type FinanceDetailRecordV13,
} from "../aggregators/financeDetailV13Aggregator.js";

const records: FinanceDetailRecordV13[] = [
  { medicalRevenue: 600, drugRevenue: 300, materialRevenue: 100, totalRevenue: 1000 },
  { medicalRevenue: 600, drugRevenue: 300, materialRevenue: 100, totalRevenue: 1000 },
];

export const financeDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/finance-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "finance-detail:read");
      if (denied) return denied;
      return json(ok({
        medicalRevenueRatio: computeMedicalRevenueRatioV13(records),
        drugRevenueRatio: computeDrugRevenueRatioV13(records),
        materialRevenueRatio: computeMaterialRevenueRatioV13(records),
      }));
    },
  },
];

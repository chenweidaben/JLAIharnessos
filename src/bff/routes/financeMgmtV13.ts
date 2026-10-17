/**
 * 健澜科技 jlmedaios - 财务管理 V13 路由（M364-B）
 *
 * GET /api/v1/finance-mgmt
 *
 * 权限：finance-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAssetLiabilityRatioV13,
  computeCostControlRateV13,
  computeRevenueGrowthRateV13,
  type FinanceMgmtRecordV13,
} from "../aggregators/financeMgmtV13Aggregator.js";

const records: FinanceMgmtRecordV13[] = [
  { currentRevenue: 110, previousRevenue: 100, budgetCost: 1000, actualCost: 950, totalLiabilities: 3000, totalAssets: 10000 },
  { currentRevenue: 110, previousRevenue: 100, budgetCost: 1000, actualCost: 950, totalLiabilities: 3000, totalAssets: 10000 },
];

export const financeMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/finance-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "finance-mgmt:read");
      if (denied) return denied;
      return json(ok({
        revenueGrowthRate: computeRevenueGrowthRateV13(records),
        costControlRate: computeCostControlRateV13(records),
        assetLiabilityRatio: computeAssetLiabilityRatioV13(records),
      }));
    },
  },
];

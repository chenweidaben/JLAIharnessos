/**
 * 健澜科技 jlmedaios - 盈亏分析 V13 路由（M407-C）
 *
 * GET /api/v1/profit-analysis
 *
 * 权限：profit-analysis:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAssetLiabilityRatioV13,
  computeReturnOnNetAssetsRateV13,
  computeSurplusDeficitRateV13,
  type ProfitAnalysisRecordV13,
} from "../aggregators/profitAnalysisV13Aggregator.js";

const records: ProfitAnalysisRecordV13[] = [
  { surplus: 50, totalRevenue: 1000, liability: 300, asset: 1000, netProfit: 100, netAsset: 1000 },
  { surplus: 50, totalRevenue: 1000, liability: 300, asset: 1000, netProfit: 100, netAsset: 1000 },
];

export const profitAnalysisV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/profit-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "profit-analysis:read");
      if (denied) return denied;
      return json(ok({
        surplusDeficitRate: computeSurplusDeficitRateV13(records),
        assetLiabilityRatio: computeAssetLiabilityRatioV13(records),
        returnOnNetAssetsRate: computeReturnOnNetAssetsRateV13(records),
      }));
    },
  },
];

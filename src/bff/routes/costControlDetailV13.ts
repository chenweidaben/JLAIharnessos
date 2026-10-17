/**
 * 健澜科技 jlmedaios - 成本控制明细 V13 路由（M396-C，避让旧版 costControlV13/medicalCostControlV13）
 *
 * GET /api/v1/cost-control-detail
 *
 * 权限：cost-control-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeptCostAccountingRateV13,
  computeHundredYuanMedicalRevenueConsumableV13,
  computePerCapitaOutpatientCostV13,
  type CostControlDetailRecordV13,
} from "../aggregators/costControlDetailV13Aggregator.js";

const records: CostControlDetailRecordV13[] = [
  { accountedCount: 95, totalCount: 100, consumableCost: 200, medicalRevenue: 1000, outpatientRevenue: 50000, outpatientCount: 1000 },
  { accountedCount: 95, totalCount: 100, consumableCost: 200, medicalRevenue: 1000, outpatientRevenue: 50000, outpatientCount: 1000 },
];

export const costControlDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cost-control-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cost-control-detail:read");
      if (denied) return denied;
      return json(ok({
        deptCostAccountingRate: computeDeptCostAccountingRateV13(records),
        hundredYuanMedicalRevenueConsumable: computeHundredYuanMedicalRevenueConsumableV13(records),
        perCapitaOutpatientCost: computePerCapitaOutpatientCostV13(records),
      }));
    },
  },
];

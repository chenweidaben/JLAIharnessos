/**
 * 健澜科技 jlmedaios - 医保费用管控 V13 路由（M445-A，医保物价与费用管理组）
 *
 * GET /api/v1/insurance-cost-control
 *
 * 权限：insurance-cost-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInsuranceCostControlRateV13,
  computeInsuranceCostGrowthControlRateV13,
  computeInsuranceCostRejectionRateV13,
  type InsuranceCostControlRecordV13,
} from "../aggregators/insuranceCostControlV13Aggregator.js";

const records: InsuranceCostControlRecordV13[] = [
  { avgActualCost: 950, avgTargetCost: 1000, rejectionAmount: 50, settlementTotal: 10000, actualGrowth: 95, targetGrowth: 100 },
  { avgActualCost: 950, avgTargetCost: 1000, rejectionAmount: 50, settlementTotal: 10000, actualGrowth: 95, targetGrowth: 100 },
];

export const insuranceCostControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-cost-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-cost-control:read");
      if (denied) return denied;
      return json(ok({
        insuranceCostControlRate: computeInsuranceCostControlRateV13(records),
        insuranceCostRejectionRate: computeInsuranceCostRejectionRateV13(records),
        insuranceCostGrowthControlRate: computeInsuranceCostGrowthControlRateV13(records),
      }));
    },
  },
];

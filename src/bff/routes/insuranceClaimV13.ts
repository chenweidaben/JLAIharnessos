/**
 * 健澜科技 jlmedaios - 医保申报 V13 路由（M382-A）
 *
 * GET /api/v1/insurance-claim
 *
 * 权限：insurance-claim:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClaimPassRateV13,
  computeInsuranceClaimAmountV13,
  computeInsuranceClaimCountV13,
  type InsuranceClaimRecordV13,
} from "../aggregators/insuranceClaimV13Aggregator.js";

const records: InsuranceClaimRecordV13[] = [
  { claimCount: 500, claimAmount: 100000, passCount: 950, totalCount: 1000 },
  { claimCount: 500, claimAmount: 100000, passCount: 950, totalCount: 1000 },
];

export const insuranceClaimV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-claim",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-claim:read");
      if (denied) return denied;
      return json(ok({
        insuranceClaimCount: computeInsuranceClaimCountV13(records),
        insuranceClaimAmount: computeInsuranceClaimAmountV13(records),
        claimPassRate: computeClaimPassRateV13(records),
      }));
    },
  },
];

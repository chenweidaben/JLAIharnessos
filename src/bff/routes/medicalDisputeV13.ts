/**
 * 健澜科技 jlmedaios - 医疗纠纷 V13 路由（M398-B）
 *
 * GET /api/v1/medical-dispute
 *
 * 权限：medical-dispute:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalDisputeCompensationAmountV13,
  computeMedicalDisputeCountV13,
  computeMedicalDisputeResolutionRateV13,
  type MedicalDisputeRecordV13,
} from "../aggregators/medicalDisputeV13Aggregator.js";

const records: MedicalDisputeRecordV13[] = [
  { disputeCount: 5, compensationAmount: 50000, resolvedCount: 4 },
  { disputeCount: 5, compensationAmount: 50000, resolvedCount: 4 },
];

export const medicalDisputeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-dispute",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-dispute:read");
      if (denied) return denied;
      return json(ok({
        medicalDisputeCount: computeMedicalDisputeCountV13(records),
        medicalDisputeCompensationAmount: computeMedicalDisputeCompensationAmountV13(records),
        medicalDisputeResolutionRate: computeMedicalDisputeResolutionRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 医疗安全 V13 路由（M371-B）
 *
 * GET /api/v1/medical-safety
 *
 * 权限：medical-safety:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCompensationAmountV13,
  computeMedicalAdverseEventCountV13,
  computeMedicalDisputeCountV13,
  type MedicalSafetyRecordV13,
} from "../aggregators/medicalSafetyV13Aggregator.js";

const records: MedicalSafetyRecordV13[] = [
  { adverseEventCount: 5, disputeCount: 2, compensationAmount: 50000 },
  { adverseEventCount: 5, disputeCount: 2, compensationAmount: 50000 },
];

export const medicalSafetyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-safety",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-safety:read");
      if (denied) return denied;
      return json(ok({
        medicalAdverseEventCount: computeMedicalAdverseEventCountV13(records),
        medicalDisputeCount: computeMedicalDisputeCountV13(records),
        compensationAmount: computeCompensationAmountV13(records),
      }));
    },
  },
];

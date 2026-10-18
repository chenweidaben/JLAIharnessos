/**
 * 健澜科技 jlmedaios - 医疗纠纷调解管理 V13 路由（M451-C，医患关系与投诉管理组）
 *
 * GET /api/v1/medical-dispute-mediation-mgmt
 *
 * 权限：medical-dispute-mediation-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalDisputeCompensationControlRateV13,
  computeMedicalDisputeMediationSuccessRateV13,
  computeMedicalDisputeOccurrenceCountV13,
  type MedicalDisputeMediationMgmtRecordV13,
} from "../aggregators/medicalDisputeMediationMgmtV13Aggregator.js";

const records: MedicalDisputeMediationMgmtRecordV13[] = [
  { success: 950, totalDispute: 1000, actualCompensation: 300, budgetCompensation: 1000, isDispute: true },
  { success: 950, totalDispute: 1000, actualCompensation: 300, budgetCompensation: 1000, isDispute: true },
];

export const medicalDisputeMediationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-dispute-mediation-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-dispute-mediation-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalDisputeMediationSuccessRate: computeMedicalDisputeMediationSuccessRateV13(records),
        medicalDisputeCompensationControlRate: computeMedicalDisputeCompensationControlRateV13(records),
        medicalDisputeOccurrenceCount: computeMedicalDisputeOccurrenceCountV13(records),
      }));
    },
  },
];

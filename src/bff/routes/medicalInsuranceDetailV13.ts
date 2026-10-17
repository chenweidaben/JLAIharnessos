/**
 * 健澜科技 jlmedaios - 医保管理明细 V13 路由（M398-C）
 *
 * GET /api/v1/medical-insurance-detail
 *
 * 权限：medical-insurance-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalInsuranceAssessmentScoreV13,
  computeMedicalInsuranceAuditDeductionV13,
  computeMedicalInsuranceRejectionAmountV13,
  type MedicalInsuranceDetailRecordV13,
} from "../aggregators/medicalInsuranceDetailV13Aggregator.js";

const records: MedicalInsuranceDetailRecordV13[] = [
  { rejectionAmount: 10000, auditDeduction: 5000, assessmentScore: 90 },
  { rejectionAmount: 10000, auditDeduction: 5000, assessmentScore: 90 },
];

export const medicalInsuranceDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-insurance-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-insurance-detail:read");
      if (denied) return denied;
      return json(ok({
        medicalInsuranceRejectionAmount: computeMedicalInsuranceRejectionAmountV13(records),
        medicalInsuranceAuditDeduction: computeMedicalInsuranceAuditDeductionV13(records),
        medicalInsuranceAssessmentScore: computeMedicalInsuranceAssessmentScoreV13(records),
      }));
    },
  },
];

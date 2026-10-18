/**
 * 健澜科技 jlmedaios - 医德医风质量管理 V13 路由（M438-A，行风廉洁与职业道德建设组）
 *
 * GET /api/v1/medical-ethics-quality-mgmt
 *
 * 权限：medical-ethics-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalEthicsComplaintResolutionTimelinessRateV13,
  computeMedicalEthicsEvaluationPassRateV13,
  computeMedicalEthicsPatientSatisfactionRateV13,
  type MedicalEthicsQualityMgmtRecordV13,
} from "../aggregators/medicalEthicsQualityMgmtV13Aggregator.js";

const records: MedicalEthicsQualityMgmtRecordV13[] = [
  { qualifiedEvaluation: 950, totalEvaluation: 1000, satisfiedPatients: 920, surveyedPatients: 1000, timelyResolved: 950, totalComplaints: 1000 },
  { qualifiedEvaluation: 950, totalEvaluation: 1000, satisfiedPatients: 920, surveyedPatients: 1000, timelyResolved: 950, totalComplaints: 1000 },
];

export const medicalEthicsQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-ethics-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-ethics-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalEthicsEvaluationPassRate: computeMedicalEthicsEvaluationPassRateV13(records),
        medicalEthicsPatientSatisfactionRate: computeMedicalEthicsPatientSatisfactionRateV13(records),
        medicalEthicsComplaintResolutionTimelinessRate: computeMedicalEthicsComplaintResolutionTimelinessRateV13(records),
      }));
    },
  },
];

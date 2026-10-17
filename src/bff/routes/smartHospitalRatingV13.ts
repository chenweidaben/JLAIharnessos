/**
 * 健澜科技 jlmedaios - 智慧医院评级自评 V13 路由（M323-C）
 *
 * GET /api/v1/smart-hospital-rating
 *
 * 权限：smart-hospital-rating:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalServiceScoreV13,
  computeNursingMgmtScoreV13,
  computeSmartHospitalOverallV13,
  computeSmartMedicalScoreV13,
  type SmartHospitalAssessmentV13,
} from "../aggregators/smartHospitalRatingV13Aggregator.js";

const assessments: SmartHospitalAssessmentV13[] = [
  { dimension: "medicalService", score: 80 },
  { dimension: "medicalService", score: 82 },
  { dimension: "medicalService", score: 84 },
  { dimension: "nursingMgmt", score: 83 },
  { dimension: "nursingMgmt", score: 85 },
  { dimension: "nursingMgmt", score: 87 },
  { dimension: "smartMedical", score: 86 },
  { dimension: "smartMedical", score: 88 },
  { dimension: "smartMedical", score: 90 },
];

export const smartHospitalRatingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/smart-hospital-rating",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "smart-hospital-rating:read");
      if (denied) return denied;
      const medicalScore = computeMedicalServiceScoreV13(assessments);
      const nursingScore = computeNursingMgmtScoreV13(assessments);
      const smartScore = computeSmartMedicalScoreV13(assessments);
      const overall = computeSmartHospitalOverallV13(medicalScore, nursingScore, smartScore);
      return json(ok({
        medicalServiceScore: medicalScore,
        nursingMgmtScore: nursingScore,
        smartMedicalScore: smartScore,
        overallScore: overall,
        isQualified: overall >= 85,
      }));
    },
  },
];

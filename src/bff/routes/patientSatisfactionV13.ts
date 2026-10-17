/**
 * 健澜科技 jlmedaios - 患者满意度调研 V13 路由（M332-A）
 *
 * GET /api/v1/patient-satisfaction-survey
 *
 * 权限：patient-satisfaction-survey:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyComplaintReasonsV13,
  computeDimensionScoresV13,
  computeOverallScoreV13,
  type PatientSurveyV13,
} from "../aggregators/patientSatisfactionV13Aggregator.js";

const surveys: PatientSurveyV13[] = [
  { overallScore: 4, medicalTech: 4, serviceAttitude: 5, environment: 4, waitTime: 3, complaintReason: "等待时间长" },
  { overallScore: 5, medicalTech: 5, serviceAttitude: 4, environment: 5, waitTime: 4, complaintReason: "" },
  { overallScore: 3, medicalTech: 3, serviceAttitude: 3, environment: 4, waitTime: 2, complaintReason: "等待时间长" },
  { overallScore: 4, medicalTech: 4, serviceAttitude: 4, environment: 3, waitTime: 4, complaintReason: "就医环境" },
  { overallScore: 4, medicalTech: 4, serviceAttitude: 5, environment: 4, waitTime: 4, complaintReason: "" },
];

export const patientSatisfactionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-satisfaction-survey",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-satisfaction-survey:read");
      if (denied) return denied;
      return json(ok({
        overallScore: computeOverallScoreV13(surveys),
        dimensions: computeDimensionScoresV13(surveys),
        complaintReasons: classifyComplaintReasonsV13(surveys),
      }));
    },
  },
];

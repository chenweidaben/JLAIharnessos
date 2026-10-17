/**
 * 健澜科技 jlmedaios - 电子病历五级评级自评 V13 路由（M323-A）
 *
 * GET /api/v1/emr5-level
 *
 * 权限：emr5-level:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmrDomainScoreV13,
  computeEmrOverallScoreV13,
  gradeEmrLevelV13,
  type EmrAssessmentV13,
} from "../aggregators/emr5LevelV13Aggregator.js";

const assessments: EmrAssessmentV13[] = [
  { domain: "dataManagement", score: 85 },
  { domain: "medicalQuality", score: 88 },
  { domain: "operationManagement", score: 82 },
  { domain: "dataUtilization", score: 86 },
  { domain: "patientService", score: 84 },
  { domain: "teachingResearch", score: 83 },
  { domain: "managementDecision", score: 87 },
  { domain: "security", score: 89 },
];

export const emr5LevelV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr5-level",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr5-level:read");
      if (denied) return denied;
      const domainScores = computeEmrDomainScoreV13(assessments);
      const overallScore = computeEmrOverallScoreV13(domainScores);
      return json(ok({
        domainScores,
        overallScore,
        level: gradeEmrLevelV13(overallScore),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 教学质量评估 V13 路由（M443-D，M443 收官，教学科研与继续教育管理组）
 *
 * GET /api/v1/teaching-quality-mgmt-assessment
 *
 * 权限：teaching-quality-mgmt-assessment:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTeachingQualityAccidentRateV13,
  computeTeachingQualityClinicalSatisfactionRateV13,
  computeTeachingQualityRoundQualifiedRateV13,
  type TeachingQualityMgmtAssessmentRecordV13,
} from "../aggregators/teachingQualityMgmtAssessmentV13Aggregator.js";

const records: TeachingQualityMgmtAssessmentRecordV13[] = [
  { qualifiedRound: 950, totalRound: 1000, satisfiedStudent: 900, surveyedStudent: 1000, teachingAccident: 5, totalTeachingActivity: 1000 },
  { qualifiedRound: 950, totalRound: 1000, satisfiedStudent: 900, surveyedStudent: 1000, teachingAccident: 5, totalTeachingActivity: 1000 },
];

export const teachingQualityMgmtAssessmentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-quality-mgmt-assessment",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-quality-mgmt-assessment:read");
      if (denied) return denied;
      return json(ok({
        teachingQualityRoundQualifiedRate: computeTeachingQualityRoundQualifiedRateV13(records),
        teachingQualityClinicalSatisfactionRate: computeTeachingQualityClinicalSatisfactionRateV13(records),
        teachingQualityAccidentRate: computeTeachingQualityAccidentRateV13(records),
      }));
    },
  },
];

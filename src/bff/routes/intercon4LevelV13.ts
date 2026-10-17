/**
 * 健澜科技 jlmedaios - 互联互通四甲自评 V13 路由（M323-B）
 *
 * GET /api/v1/intercon4-level
 *
 * 权限：intercon4-level:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBusinessCollabScoreV13,
  computeInfoSharingScoreV13,
  computeInterconOverallV13,
  computePlatformStandardScoreV13,
  type InterconAssessmentV13,
} from "../aggregators/intercon4LevelV13Aggregator.js";

const assessments: InterconAssessmentV13[] = [
  { dimension: "platformStandard", score: 80 },
  { dimension: "platformStandard", score: 85 },
  { dimension: "platformStandard", score: 90 },
  { dimension: "infoSharing", score: 85 },
  { dimension: "infoSharing", score: 90 },
  { dimension: "infoSharing", score: 95 },
  { dimension: "businessCollab", score: 82 },
  { dimension: "businessCollab", score: 88 },
  { dimension: "businessCollab", score: 94 },
];

export const intercon4LevelV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/intercon4-level",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "intercon4-level:read");
      if (denied) return denied;
      const platformScore = computePlatformStandardScoreV13(assessments);
      const infoScore = computeInfoSharingScoreV13(assessments);
      const collabScore = computeBusinessCollabScoreV13(assessments);
      const overall = computeInterconOverallV13(platformScore, infoScore, collabScore);
      return json(ok({
        platformStandardScore: platformScore,
        infoSharingScore: infoScore,
        businessCollabScore: collabScore,
        overallScore: overall,
        isQualified: overall >= 90,
      }));
    },
  },
];

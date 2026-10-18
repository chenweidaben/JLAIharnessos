/**
 * 健澜科技 jlmedaios - 继续教育质量管理 V13 路由（M434-C，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * GET /api/v1/continuing-education-quality-mgmt
 *
 * 权限：continuing-education-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeContinuingEducationCompletionRateV13,
  computeContinuingEducationCreditPassRateV13,
  computeContinuingEducationTrainingCoverageRateV13,
  type ContinuingEducationQualityMgmtRecordV13,
} from "../aggregators/continuingEducationQualityMgmtV13Aggregator.js";

const records: ContinuingEducationQualityMgmtRecordV13[] = [
  { completedCredits: 950, shouldCompleteCredits: 1000, qualifiedStaff: 980, shouldQualifiedStaff: 1000, trainedStaff: 900, totalStaff: 1000 },
  { completedCredits: 950, shouldCompleteCredits: 1000, qualifiedStaff: 980, shouldQualifiedStaff: 1000, trainedStaff: 900, totalStaff: 1000 },
];

export const continuingEducationQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/continuing-education-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "continuing-education-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        continuingEducationCompletionRate: computeContinuingEducationCompletionRateV13(records),
        continuingEducationCreditPassRate: computeContinuingEducationCreditPassRateV13(records),
        continuingEducationTrainingCoverageRate: computeContinuingEducationTrainingCoverageRateV13(records),
      }));
    },
  },
];

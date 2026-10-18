/**
 * 健澜科技 jlmedaios - 护理培训管理 V13 路由（M453-C，护理管理组）
 *
 * GET /api/v1/nursing-training-mgmt
 *
 * 权限：nursing-training-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingSpecialistTrainingCoverageRateV13,
  computeNursingThreeBaseExamQualifiedRateV13,
  computeNursingTrainingPlanCompletionRateV13,
  type NursingTrainingMgmtRecordV13,
} from "../aggregators/nursingTrainingMgmtV13Aggregator.js";

const records: NursingTrainingMgmtRecordV13[] = [
  { completed: 950, planned: 1000, qualified: 900, totalExam: 1000, trained: 980, totalShouldTrain: 1000 },
  { completed: 950, planned: 1000, qualified: 900, totalExam: 1000, trained: 980, totalShouldTrain: 1000 },
];

export const nursingTrainingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-training-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-training-mgmt:read");
      if (denied) return denied;
      return json(ok({
        nursingTrainingPlanCompletionRate: computeNursingTrainingPlanCompletionRateV13(records),
        nursingThreeBaseExamQualifiedRate: computeNursingThreeBaseExamQualifiedRateV13(records),
        nursingSpecialistTrainingCoverageRate: computeNursingSpecialistTrainingCoverageRateV13(records),
      }));
    },
  },
];

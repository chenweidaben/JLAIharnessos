/**
 * 健澜科技 jlmedaios - 护理教育 V13 路由（M389-C）
 *
 * GET /api/v1/nursing-education
 *
 * 权限：nursing-education:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNurseTrainingCompletionRateV13,
  computeNursingExamPassRateV13,
  computeNursingRoundCountV13,
  type NursingEducationRecordV13,
} from "../aggregators/nursingEducationV13Aggregator.js";

const records: NursingEducationRecordV13[] = [
  { completedCount: 950, shouldTrainCount: 1000, roundCount: 100, passedCount: 900, examCount: 1000 },
  { completedCount: 950, shouldTrainCount: 1000, roundCount: 100, passedCount: 900, examCount: 1000 },
];

export const nursingEducationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-education",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-education:read");
      if (denied) return denied;
      return json(ok({
        nurseTrainingCompletionRate: computeNurseTrainingCompletionRateV13(records),
        nursingRoundCount: computeNursingRoundCountV13(records),
        nursingExamPassRate: computeNursingExamPassRateV13(records),
      }));
    },
  },
];

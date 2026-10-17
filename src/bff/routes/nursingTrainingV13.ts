/**
 * 健澜科技 jlmedaios - 护理培训 V13 路由（M369-D，M369 收官）
 *
 * GET /api/v1/nursing-training
 *
 * 权限：nursing-training:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingTrainingCountV13,
  computeNursingTrainingParticipantCountV13,
  computeNursingTrainingPassRateV13,
  type NursingTrainingRecordV13,
} from "../aggregators/nursingTrainingV13Aggregator.js";

const records: NursingTrainingRecordV13[] = [
  { trainingCount: 5, participantCount: 200, examTake: 200, examPass: 180 },
  { trainingCount: 5, participantCount: 200, examTake: 200, examPass: 180 },
];

export const nursingTrainingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-training",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-training:read");
      if (denied) return denied;
      return json(ok({
        nursingTrainingCount: computeNursingTrainingCountV13(records),
        nursingTrainingParticipantCount: computeNursingTrainingParticipantCountV13(records),
        nursingTrainingPassRate: computeNursingTrainingPassRateV13(records),
      }));
    },
  },
];

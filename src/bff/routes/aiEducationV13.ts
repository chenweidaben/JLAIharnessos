/**
 * 健澜科技 jlmedaios - AI 教学培训 V13 路由（M366-D，M366 收官）
 *
 * GET /api/v1/ai-education
 *
 * 权限：ai-education:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAiExamPassRateV13,
  computeAiTeachingCourseCountV13,
  computeAiTrainingParticipantCountV13,
  type AiEducationRecordV13,
} from "../aggregators/aiEducationV13Aggregator.js";

const records: AiEducationRecordV13[] = [
  { teachingCourseCount: 5, trainingParticipantCount: 100, examPassed: 90, examTaken: 100 },
  { teachingCourseCount: 5, trainingParticipantCount: 100, examPassed: 90, examTaken: 100 },
];

export const aiEducationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-education",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-education:read");
      if (denied) return denied;
      return json(ok({
        aiTeachingCourseCount: computeAiTeachingCourseCountV13(records),
        aiTrainingParticipantCount: computeAiTrainingParticipantCountV13(records),
        aiExamPassRate: computeAiExamPassRateV13(records),
      }));
    },
  },
];

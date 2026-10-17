/**
 * 健澜科技 jlmedaios - 培训管理 V13 路由（M362-B）
 *
 * GET /api/v1/training-mgmt
 *
 * 权限：training-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnnualTrainingHoursV13,
  computePreJobTrainingCompletionRateV13,
  computeTrainingExamPassRateV13,
  type TrainingMgmtRecordV13,
} from "../aggregators/trainingMgmtV13Aggregator.js";

const records: TrainingMgmtRecordV13[] = [
  { completedPreJob: 950, requiredPreJob: 1000, annualHours: 40, examPassed: 480, examAttended: 500 },
  { completedPreJob: 950, requiredPreJob: 1000, annualHours: 40, examPassed: 470, examAttended: 500 },
];

export const trainingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/training-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "training-mgmt:read");
      if (denied) return denied;
      return json(ok({
        preJobCompletionRate: computePreJobTrainingCompletionRateV13(records),
        annualHours: computeAnnualTrainingHoursV13(records),
        examPassRate: computeTrainingExamPassRateV13(records),
      }));
    },
  },
];

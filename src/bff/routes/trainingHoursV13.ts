/**
 * 健澜科技 jlmedaios - 培训时长 V13 路由（M330-D）
 *
 * GET /api/v1/training-hours
 *
 * 权限：training-hours:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgTrainingHoursV13,
  computeNewHireTrainingRateV13,
  type TrainingRecordV13,
} from "../aggregators/trainingHoursV13Aggregator.js";

const records: TrainingRecordV13[] = [
  { trainingHours: 10, isNewHire: true, completedOnboarding: true },
  { trainingHours: 20, isNewHire: true, completedOnboarding: true },
  { trainingHours: 30, isNewHire: true, completedOnboarding: true },
  { trainingHours: 15, isNewHire: true, completedOnboarding: true },
  { trainingHours: 25, isNewHire: true, completedOnboarding: false },
  { trainingHours: 40, isNewHire: false, completedOnboarding: false },
  { trainingHours: 35, isNewHire: false, completedOnboarding: false },
  { trainingHours: 20, isNewHire: false, completedOnboarding: false },
];

export const trainingHoursV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/training-hours",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "training-hours:read");
      if (denied) return denied;
      return json(ok({
        avgTrainingHours: computeAvgTrainingHoursV13(records),
        newHireTrainingRate: computeNewHireTrainingRateV13(records),
      }));
    },
  },
];

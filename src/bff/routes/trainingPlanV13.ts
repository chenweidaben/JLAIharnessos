/**
 * 健澜科技 jlmedaios - 培训计划 V13 路由（M384-D，M384 收官）
 *
 * GET /api/v1/training-plan
 *
 * 权限：training-plan:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnnualTrainingPlanCountV13,
  computePerCapitaTrainingHoursV13,
  computeTrainingCompletionRateV13,
  type TrainingPlanRecordV13,
} from "../aggregators/trainingPlanV13Aggregator.js";

const records: TrainingPlanRecordV13[] = [
  { planCount: 20, completedCount: 950, plannedCount: 1000, totalHours: 10000, totalPeople: 500 },
  { planCount: 20, completedCount: 950, plannedCount: 1000, totalHours: 10000, totalPeople: 500 },
];

export const trainingPlanV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/training-plan",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "training-plan:read");
      if (denied) return denied;
      return json(ok({
        annualTrainingPlanCount: computeAnnualTrainingPlanCountV13(records),
        trainingCompletionRate: computeTrainingCompletionRateV13(records),
        perCapitaTrainingHours: computePerCapitaTrainingHoursV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 绩效改进 V13 路由（M410-D，M410 收官）
 *
 * GET /api/v1/performance-improvement
 *
 * 权限：performance-improvement:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePerformanceAppealHandleRateV13,
  computePerformanceImprovementPlanCompletionRateV13,
  computePerformanceTrainingCoverageRateV13,
  type PerformanceImprovementRecordV13,
} from "../aggregators/performanceImprovementV13Aggregator.js";

const records: PerformanceImprovementRecordV13[] = [
  { handled: 95, appealTotal: 100, completed: 90, planTotal: 100, trained: 980, shouldTrain: 1000 },
  { handled: 95, appealTotal: 100, completed: 90, planTotal: 100, trained: 980, shouldTrain: 1000 },
];

export const performanceImprovementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-improvement",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-improvement:read");
      if (denied) return denied;
      return json(ok({
        performanceAppealHandleRate: computePerformanceAppealHandleRateV13(records),
        performanceImprovementPlanCompletionRate: computePerformanceImprovementPlanCompletionRateV13(records),
        performanceTrainingCoverageRate: computePerformanceTrainingCoverageRateV13(records),
      }));
    },
  },
];

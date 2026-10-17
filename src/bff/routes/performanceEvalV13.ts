/**
 * 健澜科技 jlmedaios - 绩效考核 V13 路由（M384-C）
 *
 * GET /api/v1/performance-eval
 *
 * 权限：performance-eval:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAppealCountV13,
  computeExcellentRatioV13,
  computePerformanceEvalCompletionRateV13,
  type PerformanceEvalRecordV13,
} from "../aggregators/performanceEvalV13Aggregator.js";

const records: PerformanceEvalRecordV13[] = [
  { completedCount: 950, totalCount: 1000, excellentCount: 200, totalEvalCount: 1000, appealCount: 10 },
  { completedCount: 950, totalCount: 1000, excellentCount: 200, totalEvalCount: 1000, appealCount: 10 },
];

export const performanceEvalV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-eval",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-eval:read");
      if (denied) return denied;
      return json(ok({
        performanceEvalCompletionRate: computePerformanceEvalCompletionRateV13(records),
        excellentRatio: computeExcellentRatioV13(records),
        appealCount: computeAppealCountV13(records),
      }));
    },
  },
];

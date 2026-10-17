/**
 * 健澜科技 jlmedaios - 绩效管理 V13 路由（M395-D，M395 收官）
 *
 * GET /api/v1/performance-mgmt
 *
 * 权限：performance-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeptPerformanceEvaluationCompletionRateV13,
  computeDRGPerformanceIndicatorAchievementRateV13,
  computePatientSatisfactionIndicatorV13,
  type PerformanceMgmtRecordV13,
} from "../aggregators/performanceMgmtV13Aggregator.js";

const records: PerformanceMgmtRecordV13[] = [
  { completedDeptCount: 95, totalDeptCount: 100, achievedCount: 90, drgTotalCount: 100, satisfactionScore: 92.5 },
  { completedDeptCount: 95, totalDeptCount: 100, achievedCount: 90, drgTotalCount: 100, satisfactionScore: 92.5 },
];

export const performanceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-mgmt:read");
      if (denied) return denied;
      return json(ok({
        deptPerformanceEvaluationCompletionRate: computeDeptPerformanceEvaluationCompletionRateV13(records),
        drgPerformanceIndicatorAchievementRate: computeDRGPerformanceIndicatorAchievementRateV13(records),
        patientSatisfactionIndicator: computePatientSatisfactionIndicatorV13(records),
      }));
    },
  },
];

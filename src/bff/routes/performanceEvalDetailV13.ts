/**
 * 健澜科技 jlmedaios - 绩效考核 V13 路由（M402-D，M402 收官）
 *
 * GET /api/v1/performance-eval-detail
 *
 * 权限：performance-eval-detail:read。避让旧版 performanceEvalV13（M384）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDepartmentExcellentRateV13,
  computePerformanceAppealHandleRateV13,
  computePersonalExcellentRateV13,
  type PerformanceEvalDetailRecordV13,
} from "../aggregators/performanceEvalDetailV13Aggregator.js";

const records: PerformanceEvalDetailRecordV13[] = [
  { deptExcellent: 20, deptTotal: 100, personExcellent: 150, personTotal: 1000, handledAppeal: 95, totalAppeal: 100 },
  { deptExcellent: 20, deptTotal: 100, personExcellent: 150, personTotal: 1000, handledAppeal: 95, totalAppeal: 100 },
];

export const performanceEvalDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-eval-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-eval-detail:read");
      if (denied) return denied;
      return json(ok({
        departmentExcellentRate: computeDepartmentExcellentRateV13(records),
        personalExcellentRate: computePersonalExcellentRateV13(records),
        performanceAppealHandleRate: computePerformanceAppealHandleRateV13(records),
      }));
    },
  },
];

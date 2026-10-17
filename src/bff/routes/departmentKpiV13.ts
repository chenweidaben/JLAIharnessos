/**
 * 健澜科技 jlmedaios - 科室KPI V13 路由（M410-A）
 *
 * GET /api/v1/department-kpi
 *
 * 权限：department-kpi:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDepartmentKpiCompletionRateV13,
  computeDepartmentPerformanceScoreV13,
  computeDepartmentRankingV13,
  type DepartmentKpiRecordV13,
} from "../aggregators/departmentKpiV13Aggregator.js";

const records: DepartmentKpiRecordV13[] = [
  { completed: 95, total: 100, score: 85.5, ranking: 3 },
  { completed: 95, total: 100, score: 85.5, ranking: 5 },
];

export const departmentKpiV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/department-kpi",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "department-kpi:read");
      if (denied) return denied;
      return json(ok({
        departmentKpiCompletionRate: computeDepartmentKpiCompletionRateV13(records),
        departmentPerformanceScore: computeDepartmentPerformanceScoreV13(records),
        departmentRanking: computeDepartmentRankingV13(records),
      }));
    },
  },
];

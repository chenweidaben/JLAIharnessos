/**
 * 健澜科技 jlmedaios - 个人KPI V13 路由（M410-B）
 *
 * GET /api/v1/individual-kpi
 *
 * 权限：individual-kpi:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIndividualExcellentRateV13,
  computeIndividualKpiCompletionRateV13,
  computeIndividualPerformanceScoreV13,
  type IndividualKpiRecordV13,
} from "../aggregators/individualKpiV13Aggregator.js";

const records: IndividualKpiRecordV13[] = [
  { completed: 98, total: 100, score: 88.5, excellent: 20, assessed: 100 },
  { completed: 98, total: 100, score: 88.5, excellent: 20, assessed: 100 },
];

export const individualKpiV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/individual-kpi",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "individual-kpi:read");
      if (denied) return denied;
      return json(ok({
        individualKpiCompletionRate: computeIndividualKpiCompletionRateV13(records),
        individualPerformanceScore: computeIndividualPerformanceScoreV13(records),
        individualExcellentRate: computeIndividualExcellentRateV13(records),
      }));
    },
  },
];

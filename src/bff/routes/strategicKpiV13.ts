/**
 * 健澜科技 jlmedaios - 战略KPI V13 路由（M407-D，M407 收官）
 *
 * GET /api/v1/strategic-kpi
 *
 * 权限：strategic-kpi:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnnualKpiCompletionRateV13,
  computeKeyTaskCompletionRateV13,
  computeLeadershipTeamAssessScoreV13,
  type StrategicKpiRecordV13,
} from "../aggregators/strategicKpiV13Aggregator.js";

const records: StrategicKpiRecordV13[] = [
  { completed: 95, totalKpi: 100, taskDone: 90, taskTotal: 100, score: 85.5 },
  { completed: 95, totalKpi: 100, taskDone: 90, taskTotal: 100, score: 85.5 },
];

export const strategicKpiV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/strategic-kpi",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "strategic-kpi:read");
      if (denied) return denied;
      return json(ok({
        annualKpiCompletionRate: computeAnnualKpiCompletionRateV13(records),
        keyTaskCompletionRate: computeKeyTaskCompletionRateV13(records),
        leadershipTeamAssessScore: computeLeadershipTeamAssessScoreV13(records),
      }));
    },
  },
];

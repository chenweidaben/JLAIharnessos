/**
 * 健澜科技 jlmedaios - 康复医学 V13 路由（M350-B，stats 避让已有 rehabilitationV5/report-v2）
 *
 * GET /api/v1/rehabilitation-stats
 *
 * 权限：rehabilitation-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAssessmentCountV13,
  computeFunctionalImprovementRateV13,
  computeTherapySessionsV13,
  type RehabilitationRecordV13,
} from "../aggregators/rehabilitationStatsV13Aggregator.js";

const records: RehabilitationRecordV13[] = [
  { assessmentCount: 50, therapySessions: 100, improvedCount: 85 },
  { assessmentCount: 50, therapySessions: 100, improvedCount: 85 },
];

export const rehabilitationStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rehabilitation-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rehabilitation-stats:read");
      if (denied) return denied;
      return json(ok({
        assessmentCount: computeAssessmentCountV13(records),
        therapySessions: computeTherapySessionsV13(records),
        functionalImprovementRate: computeFunctionalImprovementRateV13(records),
      }));
    },
  },
];

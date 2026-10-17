/**
 * 健澜科技 jlmedaios - 跌倒预防 V13 路由（M394-A，新规格）
 *
 * GET /api/v1/fall-prevention
 *
 * 权限：fall-prevention:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFallInjuryGradeCompositionV13,
  computeFallIncidenceRateV13,
  computeFallRiskAssessmentRateV13,
  type FallPreventionRecordV13,
} from "../aggregators/fallPreventionV13Aggregator.js";

const records: FallPreventionRecordV13[] = [
  { fallCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, noneCount: 3, minorCount: 1, majorCount: 1, deathCount: 0 },
  { fallCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, noneCount: 3, minorCount: 1, majorCount: 1, deathCount: 0 },
];

export const fallPreventionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fall-prevention",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fall-prevention:read");
      if (denied) return denied;
      return json(ok({
        fallIncidenceRate: computeFallIncidenceRateV13(records),
        fallRiskAssessmentRate: computeFallRiskAssessmentRateV13(records),
        fallInjuryGradeComposition: computeFallInjuryGradeCompositionV13(records),
      }));
    },
  },
];

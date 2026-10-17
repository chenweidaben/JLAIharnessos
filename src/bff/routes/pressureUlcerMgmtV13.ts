/**
 * 健澜科技 jlmedaios - 压疮管理 V13 路由（M394-B）
 *
 * GET /api/v1/pressure-ulcer-mgmt
 *
 * 权限：pressure-ulcer-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePressureUlcerHealingRateV13,
  computePressureUlcerIncidenceRateV13,
  computePressureUlcerRiskAssessmentRateV13,
  type PressureUlcerMgmtRecordV13,
} from "../aggregators/pressureUlcerMgmtV13Aggregator.js";

const records: PressureUlcerMgmtRecordV13[] = [
  { occurrenceCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, healedCount: 8, totalCount: 10 },
  { occurrenceCount: 5, bedDayCount: 10000, assessedCount: 950, shouldCount: 1000, healedCount: 8, totalCount: 10 },
];

export const pressureUlcerMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pressure-ulcer-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pressure-ulcer-mgmt:read");
      if (denied) return denied;
      return json(ok({
        pressureUlcerIncidenceRate: computePressureUlcerIncidenceRateV13(records),
        pressureUlcerRiskAssessmentRate: computePressureUlcerRiskAssessmentRateV13(records),
        pressureUlcerHealingRate: computePressureUlcerHealingRateV13(records),
      }));
    },
  },
];

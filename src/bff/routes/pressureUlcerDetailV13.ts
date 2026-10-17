/**
 * 健澜科技 jlmedaios - 压疮管理（细节）V13 路由（M422-B，detail 避让旧版 pressureUlcerMgmtV13（M394-B））
 *
 * GET /api/v1/pressure-ulcer-detail
 *
 * 权限：pressure-ulcer-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHospitalPressureUlcerOccurrenceRateV13,
  computePressureUlcerHealingRateV13,
  computePressureUlcerReportTimelyRateV13,
  type PressureUlcerDetailRecordV13,
} from "../aggregators/pressureUlcerDetailV13Aggregator.js";

const records: PressureUlcerDetailRecordV13[] = [
  { occurredPatients: 5, inpatientTotal: 10000, reportedTimely: 98, pressureUlcerTotal: 100, healedCount: 90 },
  { occurredPatients: 5, inpatientTotal: 10000, reportedTimely: 98, pressureUlcerTotal: 100, healedCount: 90 },
];

export const pressureUlcerDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pressure-ulcer-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pressure-ulcer-detail:read");
      if (denied) return denied;
      return json(ok({
        hospitalPressureUlcerOccurrenceRate: computeHospitalPressureUlcerOccurrenceRateV13(records),
        pressureUlcerReportTimelyRate: computePressureUlcerReportTimelyRateV13(records),
        pressureUlcerHealingRate: computePressureUlcerHealingRateV13(records),
      }));
    },
  },
];

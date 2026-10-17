/**
 * 健澜科技 jlmedaios - 知情同意统计 V13 路由（M387-C，stats 避让）
 *
 * GET /api/v1/informed-consent-stats
 *
 * 权限：informed-consent-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInformedConsentSignRateV13,
  computeSpecialExamConsentRateV13,
  computeSurgeryConsentRateV13,
  type InformedConsentRecordV13,
} from "../aggregators/informedConsentStatsV13Aggregator.js";

const records: InformedConsentRecordV13[] = [
  { signedCount: 990, shouldCount: 1000, specialSignedCount: 950, specialShouldCount: 1000, surgerySignedCount: 1000, surgeryShouldCount: 1000 },
  { signedCount: 990, shouldCount: 1000, specialSignedCount: 950, specialShouldCount: 1000, surgerySignedCount: 1000, surgeryShouldCount: 1000 },
];

export const informedConsentStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/informed-consent-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "informed-consent-stats:read");
      if (denied) return denied;
      return json(ok({
        informedConsentSignRate: computeInformedConsentSignRateV13(records),
        specialExamConsentRate: computeSpecialExamConsentRateV13(records),
        surgeryConsentRate: computeSurgeryConsentRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 知情同意管理（细节）V13 路由（M413-B，detail 避让旧版 informedConsentStatsV13）
 *
 * GET /api/v1/informed-consent-detail
 *
 * 权限：informed-consent-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInformedConsentContentCompletenessRateV13,
  computeInformedConsentSignRateV13,
  computeSpecialExaminationConsentRateV13,
  type InformedConsentDetailRecordV13,
} from "../aggregators/informedConsentDetailV13Aggregator.js";

const records: InformedConsentDetailRecordV13[] = [
  { signed: 980, shouldTotal: 1000, complete: 950, consentTotal: 1000, specialAgreed: 99, specialTotal: 100 },
  { signed: 980, shouldTotal: 1000, complete: 950, consentTotal: 1000, specialAgreed: 99, specialTotal: 100 },
];

export const informedConsentDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/informed-consent-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "informed-consent-detail:read");
      if (denied) return denied;
      return json(ok({
        informedConsentSignRate: computeInformedConsentSignRateV13(records),
        informedConsentContentCompletenessRate: computeInformedConsentContentCompletenessRateV13(records),
        specialExaminationConsentRate: computeSpecialExaminationConsentRateV13(records),
      }));
    },
  },
];

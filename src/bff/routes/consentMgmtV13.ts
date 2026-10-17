/**
 * 健澜科技 jlmedaios - 知情同意管理 V13 路由（M425-C，换名避让旧版 consentDetailV13（M413））
 *
 * GET /api/v1/consent-mgmt
 *
 * 权限：consent-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInformedConsentFormPassRateV13,
  computeInformedConsentSignRateV13,
  computeSpecialTreatmentConsentRateV13,
  type ConsentMgmtRecordV13,
} from "../aggregators/consentMgmtV13Aggregator.js";

const records: ConsentMgmtRecordV13[] = [
  { signed: 990, shouldSign: 1000, formPass: 980, signedTotal: 1000, specialSigned: 950, specialCase: 1000 },
  { signed: 990, shouldSign: 1000, formPass: 980, signedTotal: 1000, specialSigned: 950, specialCase: 1000 },
];

export const consentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/consent-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "consent-mgmt:read");
      if (denied) return denied;
      return json(ok({
        informedConsentSignRate: computeInformedConsentSignRateV13(records),
        informedConsentFormPassRate: computeInformedConsentFormPassRateV13(records),
        specialTreatmentConsentRate: computeSpecialTreatmentConsentRateV13(records),
      }));
    },
  },
];

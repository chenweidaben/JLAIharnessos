/**
 * 健澜科技 jlmedaios - 知情同意书签署率 V13 路由（M340-C）
 *
 * GET /api/v1/informed-consent
 *
 * 权限：informed-consent:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSpecialExamConsentRateV13,
  computeSpecialTreatmentConsentRateV13,
  computeSurgeryConsentRateV13,
  type InformedConsentRecordV13,
} from "../aggregators/informedConsentV13Aggregator.js";

const records: InformedConsentRecordV13[] = [
  {
    surgeryRequired: 100,
    surgerySigned: 100,
    specialExamRequired: 50,
    specialExamSigned: 45,
    specialTreatmentRequired: 30,
    specialTreatmentSigned: 27,
  },
];

export const informedConsentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/informed-consent",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "informed-consent:read");
      if (denied) return denied;
      return json(ok({
        surgeryRate: computeSurgeryConsentRateV13(records),
        specialExamRate: computeSpecialExamConsentRateV13(records),
        specialTreatmentRate: computeSpecialTreatmentConsentRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 患者隐私保护 V13 路由（M363-B）
 *
 * GET /api/v1/patient-privacy
 *
 * 权限：patient-privacy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePrivacyLeakCountV13,
  computePrivacyPolicyAwarenessRateV13,
  computeSensitiveDataMaskingCoverageRateV13,
  type PatientPrivacyRecordV13,
} from "../aggregators/patientPrivacyV13Aggregator.js";

const records: PatientPrivacyRecordV13[] = [
  { leakCount: 1, awarenessCount: 480, surveyCount: 500, maskedFields: 95, totalSensitiveFields: 100 },
  { leakCount: 1, awarenessCount: 470, surveyCount: 500, maskedFields: 95, totalSensitiveFields: 100 },
];

export const patientPrivacyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-privacy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-privacy:read");
      if (denied) return denied;
      return json(ok({
        leakCount: computePrivacyLeakCountV13(records),
        awarenessRate: computePrivacyPolicyAwarenessRateV13(records),
        maskingCoverageRate: computeSensitiveDataMaskingCoverageRateV13(records),
      }));
    },
  },
];

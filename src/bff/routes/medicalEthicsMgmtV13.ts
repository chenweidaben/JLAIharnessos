/**
 * 健澜科技 jlmedaios - 医学伦理管理 V13 路由（M420-C）
 *
 * GET /api/v1/medical-ethics-mgmt
 *
 * 权限：medical-ethics-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEthicsConsultationResponseRateV13,
  computeEthicsReviewProjectCountV13,
  computeSubjectProtectionComplianceRateV13,
  type MedicalEthicsMgmtRecordV13,
} from "../aggregators/medicalEthicsMgmtV13Aggregator.js";

const records: MedicalEthicsMgmtRecordV13[] = [
  { reviewProjects: 20, consultationResponded: 980, consultationTotal: 1000, subjectProtectionCompliant: 950, reviewProjectTotal: 1000 },
  { reviewProjects: 30, consultationResponded: 980, consultationTotal: 1000, subjectProtectionCompliant: 950, reviewProjectTotal: 1000 },
];

export const medicalEthicsMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-ethics-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-ethics-mgmt:read");
      if (denied) return denied;
      return json(ok({
        ethicsReviewProjectCount: computeEthicsReviewProjectCountV13(records),
        ethicsConsultationResponseRate: computeEthicsConsultationResponseRateV13(records),
        subjectProtectionComplianceRate: computeSubjectProtectionComplianceRateV13(records),
      }));
    },
  },
];

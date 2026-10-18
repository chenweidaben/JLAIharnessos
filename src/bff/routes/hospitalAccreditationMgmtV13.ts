/**
 * 健澜科技 jlmedaios - 医院评审迎检管理 V13 路由（M452-A，医院评审与临床质量改进组）
 *
 * GET /api/v1/hospital-accreditation-mgmt
 *
 * 权限：hospital-accreditation-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHospitalAccreditationClauseComplianceRateV13,
  computeHospitalAccreditationRectificationRateV13,
  computeHospitalAccreditationTaskCompletionRateV13,
  type HospitalAccreditationMgmtRecordV13,
} from "../aggregators/hospitalAccreditationMgmtV13Aggregator.js";

const records: HospitalAccreditationMgmtRecordV13[] = [
  { completed: 950, totalTask: 1000, qualified: 900, totalClause: 1000, rectified: 980, totalIssue: 1000 },
  { completed: 950, totalTask: 1000, qualified: 900, totalClause: 1000, rectified: 980, totalIssue: 1000 },
];

export const hospitalAccreditationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospital-accreditation-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospital-accreditation-mgmt:read");
      if (denied) return denied;
      return json(ok({
        hospitalAccreditationTaskCompletionRate: computeHospitalAccreditationTaskCompletionRateV13(records),
        hospitalAccreditationClauseComplianceRate: computeHospitalAccreditationClauseComplianceRateV13(records),
        hospitalAccreditationRectificationRate: computeHospitalAccreditationRectificationRateV13(records),
      }));
    },
  },
];

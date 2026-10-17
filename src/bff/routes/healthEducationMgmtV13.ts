/**
 * 健澜科技 jlmedaios - 健康教育管理 V13 路由（M420-B）
 *
 * GET /api/v1/health-education-mgmt
 *
 * 权限：health-education-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHealthConsultationCoverageRateV13,
  computeHealthEducationPrescriptionIssueRateV13,
  computeHealthLectureSessionCountV13,
  type HealthEducationMgmtRecordV13,
} from "../aggregators/healthEducationMgmtV13Aggregator.js";

const records: HealthEducationMgmtRecordV13[] = [
  { prescriptionIssued: 950, prescriptionShouldIssue: 1000, lectureSessions: 12, consultationCovered: 980, consultationShouldCover: 1000 },
  { prescriptionIssued: 950, prescriptionShouldIssue: 1000, lectureSessions: 18, consultationCovered: 980, consultationShouldCover: 1000 },
];

export const healthEducationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-education-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-education-mgmt:read");
      if (denied) return denied;
      return json(ok({
        healthEducationPrescriptionIssueRate: computeHealthEducationPrescriptionIssueRateV13(records),
        healthLectureSessionCount: computeHealthLectureSessionCountV13(records),
        healthConsultationCoverageRate: computeHealthConsultationCoverageRateV13(records),
      }));
    },
  },
];

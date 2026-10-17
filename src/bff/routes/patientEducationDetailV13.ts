/**
 * 健澜科技 jlmedaios - 患者教育明细 V13 路由（M400-D，M400 收官，避让旧版 patientEducationV13）
 *
 * GET /api/v1/patient-education-detail
 *
 * 权限：patient-education-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEducationMaterialDistributionCountV13,
  computeHealthEducationSessionCountV13,
  computePatientHealthKnowledgeAwarenessRateV13,
  type PatientEducationDetailRecordV13,
} from "../aggregators/patientEducationDetailV13Aggregator.js";

const records: PatientEducationDetailRecordV13[] = [
  { sessionCount: 10, materialCount: 500, awareCount: 850, totalCount: 1000 },
  { sessionCount: 10, materialCount: 500, awareCount: 850, totalCount: 1000 },
];

export const patientEducationDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-education-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-education-detail:read");
      if (denied) return denied;
      return json(ok({
        healthEducationSessionCount: computeHealthEducationSessionCountV13(records),
        educationMaterialDistributionCount: computeEducationMaterialDistributionCountV13(records),
        patientHealthKnowledgeAwarenessRate: computePatientHealthKnowledgeAwarenessRateV13(records),
      }));
    },
  },
];

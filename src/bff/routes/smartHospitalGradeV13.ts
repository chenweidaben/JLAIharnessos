/**
 * 健澜科技 jlmedaios - 智慧医院分级 V13 路由（M395-A，避让旧版 smartHospitalRatingV13）
 *
 * GET /api/v1/smart-hospital-grade
 *
 * 权限：smart-hospital-grade:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSmartManagementGradeLevelV13,
  computeSmartMedicalGradeLevelV13,
  computeSmartServiceGradeLevelV13,
  type SmartHospitalGradeRecordV13,
} from "../aggregators/smartHospitalGradeV13Aggregator.js";

const records: SmartHospitalGradeRecordV13[] = [
  { serviceLevel: 3, serviceScore: 85, medicalLevel: 4, medicalScore: 90, managementLevel: 3, managementScore: 88 },
  { serviceLevel: 3, serviceScore: 85, medicalLevel: 4, medicalScore: 90, managementLevel: 3, managementScore: 88 },
];

export const smartHospitalGradeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/smart-hospital-grade",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "smart-hospital-grade:read");
      if (denied) return denied;
      return json(ok({
        smartServiceGradeLevel: computeSmartServiceGradeLevelV13(records),
        smartMedicalGradeLevel: computeSmartMedicalGradeLevelV13(records),
        smartManagementGradeLevel: computeSmartManagementGradeLevelV13(records),
      }));
    },
  },
];

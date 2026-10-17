/**
 * 健澜科技 jlmedaios - 医疗质量 V13 路由（M371-A）
 *
 * GET /api/v1/medical-quality
 *
 * 权限：medical-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCureRateV13,
  computeImprovementRateV13,
  computeMedicalRecordGradeARateV13,
  type MedicalQualityRecordV13,
} from "../aggregators/medicalQualityV13Aggregator.js";

const records: MedicalQualityRecordV13[] = [
  { totalRecords: 100, gradeARecords: 95, dischargeCount: 1000, curedCount: 400, improvedCount: 500 },
  { totalRecords: 100, gradeARecords: 95, dischargeCount: 1000, curedCount: 400, improvedCount: 500 },
];

export const medicalQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-quality:read");
      if (denied) return denied;
      return json(ok({
        medicalRecordGradeARate: computeMedicalRecordGradeARateV13(records),
        cureRate: computeCureRateV13(records),
        improvementRate: computeImprovementRateV13(records),
      }));
    },
  },
];

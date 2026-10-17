/**
 * 健澜科技 jlmedaios - 病案质量管理 V13 路由（M354-B）
 *
 * GET /api/v1/medical-record-quality
 *
 * 权限：medical-record-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compute7DayFilingRateV13,
  computeDRGEnrollmentRateV13,
  computeGradeARateV13,
  type MedicalRecordQualityRecordV13,
} from "../aggregators/medicalRecordQualityV13Aggregator.js";

const records: MedicalRecordQualityRecordV13[] = [
  { gradeACount: 95, sampledCount: 100, filedWithin7DaysCount: 180, dischargedCount: 200, drgEnrolledCount: 80, totalCaseCount: 100 },
  { gradeACount: 95, sampledCount: 100, filedWithin7DaysCount: 180, dischargedCount: 200, drgEnrolledCount: 80, totalCaseCount: 100 },
];

export const medicalRecordQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-record-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-record-quality:read");
      if (denied) return denied;
      return json(ok({
        gradeARate: computeGradeARateV13(records),
        sevenDayFilingRate: compute7DayFilingRateV13(records),
        drgEnrollmentRate: computeDRGEnrollmentRateV13(records),
      }));
    },
  },
];

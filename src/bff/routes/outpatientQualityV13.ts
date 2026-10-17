/**
 * 健澜科技 jlmedaios - 门诊质量 V13 路由（M372-C）
 *
 * GET /api/v1/outpatient-quality
 *
 * 权限：outpatient-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientAverageLodgingDaysV13,
  computeOutpatientDiagnosisConsistencyRateV13,
  computeOutpatientPrescriptionPassRateV13,
  type OutpatientQualityRecordV13,
} from "../aggregators/outpatientQualityV13Aggregator.js";

const records: OutpatientQualityRecordV13[] = [
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 95, prescriptionCount: 100, prescriptionPass: 98, averageLodgingDays: 7 },
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 95, prescriptionCount: 100, prescriptionPass: 98, averageLodgingDays: 7 },
];

export const outpatientQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-quality:read");
      if (denied) return denied;
      return json(ok({
        outpatientDiagnosisConsistencyRate: computeOutpatientDiagnosisConsistencyRateV13(records),
        outpatientPrescriptionPassRate: computeOutpatientPrescriptionPassRateV13(records),
        outpatientAverageLodgingDays: computeOutpatientAverageLodgingDaysV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 住院质量 V13 路由（M373-C）
 *
 * GET /api/v1/inpatient-quality
 *
 * 权限：inpatient-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCriticalRescueSuccessRateV13,
  computeInpatientDiagnosisConsistencyRateV13,
  computePrePostOpDiagnosisConsistencyRateV13,
  type InpatientQualityRecordV13,
} from "../aggregators/inpatientQualityV13Aggregator.js";

const records: InpatientQualityRecordV13[] = [
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 98, prePostOpSample: 100, prePostOpPass: 99, criticalRescueCount: 100, criticalRescueSuccess: 90 },
  { diagnosisConsistencySample: 100, diagnosisConsistencyPass: 98, prePostOpSample: 100, prePostOpPass: 99, criticalRescueCount: 100, criticalRescueSuccess: 90 },
];

export const inpatientQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-quality:read");
      if (denied) return denied;
      return json(ok({
        inpatientDiagnosisConsistencyRate: computeInpatientDiagnosisConsistencyRateV13(records),
        prePostOpDiagnosisConsistencyRate: computePrePostOpDiagnosisConsistencyRateV13(records),
        criticalRescueSuccessRate: computeCriticalRescueSuccessRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 影像质量 V13 路由（M374-D，M374 收官）
 *
 * GET /api/v1/radiology-quality
 *
 * 权限：radiology-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRadiologyDiagnosisConsistencyRateV13,
  computeRadiologyGradeAFilmRateV13,
  computeRadiologyReportTimelyRateV13,
  type RadiologyQualityRecordV13,
} from "../aggregators/radiologyQualityV13Aggregator.js";

const records: RadiologyQualityRecordV13[] = [
  { totalFilmCount: 100, gradeAFilmCount: 95, diagnosisSample: 100, diagnosisPass: 98, totalReportCount: 100, timelyReportCount: 99 },
  { totalFilmCount: 100, gradeAFilmCount: 95, diagnosisSample: 100, diagnosisPass: 98, totalReportCount: 100, timelyReportCount: 99 },
];

export const radiologyQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/radiology-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "radiology-quality:read");
      if (denied) return denied;
      return json(ok({
        radiologyGradeAFilmRate: computeRadiologyGradeAFilmRateV13(records),
        radiologyDiagnosisConsistencyRate: computeRadiologyDiagnosisConsistencyRateV13(records),
        radiologyReportTimelyRate: computeRadiologyReportTimelyRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 病理质量管理 V13 路由（M430-B，-quality 后缀避让旧版 pathologyMgmtV13（M415））
 *
 * GET /api/v1/pathology-quality-mgmt
 *
 * 权限：pathology-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePathologyDiagnosisMatchRateV13,
  computePathologyReportPassRateV13,
  computePathologySpecimenPassRateV13,
  type PathologyQualityMgmtRecordV13,
} from "../aggregators/pathologyQualityMgmtV13Aggregator.js";

const records: PathologyQualityMgmtRecordV13[] = [
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, specimenPass: 990, specimenTotal: 1000 },
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, specimenPass: 990, specimenTotal: 1000 },
];

export const pathologyQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pathology-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pathology-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        pathologyReportPassRate: computePathologyReportPassRateV13(records),
        pathologyDiagnosisMatchRate: computePathologyDiagnosisMatchRateV13(records),
        pathologySpecimenPassRate: computePathologySpecimenPassRateV13(records),
      }));
    },
  },
];

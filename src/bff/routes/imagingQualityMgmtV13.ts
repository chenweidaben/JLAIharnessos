/**
 * 健澜科技 jlmedaios - 影像质量管理 V13 路由（M430-A，-quality 后缀避让旧版 medicalImagingDetailV13（M415））
 *
 * GET /api/v1/imaging-quality-mgmt
 *
 * 权限：imaging-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeImagingDiagnosisMatchRateV13,
  computeImagingExaminationPositiveRateV13,
  computeImagingReportPassRateV13,
  type ImagingQualityMgmtRecordV13,
} from "../aggregators/imagingQualityMgmtV13Aggregator.js";

const records: ImagingQualityMgmtRecordV13[] = [
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, positiveExam: 600, examTotal: 1000 },
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, positiveExam: 600, examTotal: 1000 },
];

export const imagingQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/imaging-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "imaging-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        imagingReportPassRate: computeImagingReportPassRateV13(records),
        imagingDiagnosisMatchRate: computeImagingDiagnosisMatchRateV13(records),
        imagingExaminationPositiveRate: computeImagingExaminationPositiveRateV13(records),
      }));
    },
  },
];

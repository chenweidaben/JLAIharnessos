/**
 * 健澜科技 jlmedaios - 影像质控 V13 路由（M392-B）
 *
 * GET /api/v1/imaging-quality-control
 *
 * 权限：imaging-quality-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeImageGradeARateV13,
  computeImagingDiagnosisConcordanceRateV13,
  computeImagingReportTimelyRateV13,
  type ImagingQualityControlRecordV13,
} from "../aggregators/imagingQualityControlV13Aggregator.js";

const records: ImagingQualityControlRecordV13[] = [
  { gradeACount: 950, totalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, timelyCount: 980, reportTotalCount: 1000 },
  { gradeACount: 950, totalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, timelyCount: 980, reportTotalCount: 1000 },
];

export const imagingQualityControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/imaging-quality-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "imaging-quality-control:read");
      if (denied) return denied;
      return json(ok({
        imageGradeARate: computeImageGradeARateV13(records),
        imagingDiagnosisConcordanceRate: computeImagingDiagnosisConcordanceRateV13(records),
        imagingReportTimelyRate: computeImagingReportTimelyRateV13(records),
      }));
    },
  },
];

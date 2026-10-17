/**
 * 健澜科技 jlmedaios - 影像质量 V13 路由（M360-B，新规格）
 *
 * GET /api/v1/imaging-quality
 *
 * 权限：imaging-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeGradeAFilmRateV13,
  computeImagingPositiveRateV13,
  computeImagingReportTimelyRateV13,
  type ImagingQualityRecordV13,
} from "../aggregators/imagingQualityV13Aggregator.js";

const records: ImagingQualityRecordV13[] = [
  { reportTimely: 950, reportCount: 1000, positiveCount: 300, examCount: 1000, gradeAFilm: 480, totalFilm: 500 },
  { reportTimely: 940, reportCount: 1000, positiveCount: 300, examCount: 1000, gradeAFilm: 470, totalFilm: 500 },
];

export const imagingQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/imaging-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "imaging-quality:read");
      if (denied) return denied;
      return json(ok({
        imagingReportTimelyRate: computeImagingReportTimelyRateV13(records),
        imagingPositiveRate: computeImagingPositiveRateV13(records),
        gradeAFilmRate: computeGradeAFilmRateV13(records),
      }));
    },
  },
];

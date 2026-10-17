/**
 * 健澜科技 jlmedaios - 病理质控 V13 路由（M392-C）
 *
 * GET /api/v1/pathology-quality-control
 *
 * 权限：pathology-quality-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePathologyDiagnosisConcordanceRateV13,
  computePathologyReportTimelyRateV13,
  computeSpecimenQualificationRateV13,
  type PathologyQualityControlRecordV13,
} from "../aggregators/pathologyQualityControlV13Aggregator.js";

const records: PathologyQualityControlRecordV13[] = [
  { timelyCount: 950, reportTotalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, qualifiedCount: 980, specimenTotalCount: 1000 },
  { timelyCount: 950, reportTotalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, qualifiedCount: 980, specimenTotalCount: 1000 },
];

export const pathologyQualityControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pathology-quality-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pathology-quality-control:read");
      if (denied) return denied;
      return json(ok({
        pathologyReportTimelyRate: computePathologyReportTimelyRateV13(records),
        pathologyDiagnosisConcordanceRate: computePathologyDiagnosisConcordanceRateV13(records),
        specimenQualificationRate: computeSpecimenQualificationRateV13(records),
      }));
    },
  },
];

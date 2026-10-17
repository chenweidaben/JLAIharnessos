/**
 * 健澜科技 jlmedaios - 病理质量 V13 路由（M360-C）
 *
 * GET /api/v1/pathology-quality
 *
 * 权限：pathology-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPathologyConsistencyRateV13,
  computeFrozenSectionTimelyRateV13,
  computePathologyReportTimelyRateV13,
  type PathologyQualityRecordV13,
} from "../aggregators/pathologyQualityV13Aggregator.js";

const records: PathologyQualityRecordV13[] = [
  { reportTimely: 95, reportCount: 100, consistencyPassed: 480, consistencyCount: 500, frozenTimely: 90, frozenCount: 100 },
  { reportTimely: 95, reportCount: 100, consistencyPassed: 470, consistencyCount: 500, frozenTimely: 90, frozenCount: 100 },
];

export const pathologyQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pathology-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pathology-quality:read");
      if (denied) return denied;
      return json(ok({
        pathologyReportTimelyRate: computePathologyReportTimelyRateV13(records),
        clinicalPathologyConsistencyRate: computeClinicalPathologyConsistencyRateV13(records),
        frozenSectionTimelyRate: computeFrozenSectionTimelyRateV13(records),
      }));
    },
  },
];

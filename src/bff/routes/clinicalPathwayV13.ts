/**
 * 健澜科技 jlmedaios - 临床路径执行率 V13 路由（M333-A）
 *
 * GET /api/v1/clinical-pathway-overview
 *
 * 权限：clinical-pathway-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCompletionRateV13,
  computeEnrollmentRateV13,
  computeVariationRateV13,
  type PathwayRecordV13,
} from "../aggregators/clinicalPathwayV13Aggregator.js";

const records: PathwayRecordV13[] = [
  { eligibleCount: 100, enrolledCount: 80, completedCount: 60, variationCount: 10 },
];

export const clinicalPathwayV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-pathway-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-pathway-overview:read");
      if (denied) return denied;
      return json(ok({
        enrollmentRate: computeEnrollmentRateV13(records),
        completionRate: computeCompletionRateV13(records),
        variationRate: computeVariationRateV13(records),
      }));
    },
  },
];

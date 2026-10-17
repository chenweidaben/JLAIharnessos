/**
 * 健澜科技 jlmedaios - 临床路径统计 V13 路由（M386-D，stats 避让，M386 收官）
 *
 * GET /api/v1/clinical-pathway-stats
 *
 * 权限：clinical-pathway-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPathwayCompletionRateV13,
  computeClinicalPathwayEnrollmentRateV13,
  computeClinicalPathwayVariationRateV13,
  type ClinicalPathwayRecordV13,
} from "../aggregators/clinicalPathwayStatsV13Aggregator.js";

const records: ClinicalPathwayRecordV13[] = [
  { enrolledCount: 800, totalEligibleCount: 1000, completedCount: 720, variationCount: 80 },
  { enrolledCount: 800, totalEligibleCount: 1000, completedCount: 720, variationCount: 80 },
];

export const clinicalPathwayStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-pathway-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-pathway-stats:read");
      if (denied) return denied;
      return json(ok({
        enrollmentRate: computeClinicalPathwayEnrollmentRateV13(records),
        completionRate: computeClinicalPathwayCompletionRateV13(records),
        variationRate: computeClinicalPathwayVariationRateV13(records),
      }));
    },
  },
];

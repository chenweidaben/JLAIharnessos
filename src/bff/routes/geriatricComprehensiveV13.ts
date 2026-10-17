/**
 * 健澜科技 jlmedaios - 老年综合评估 V13 路由（M350-C）
 *
 * GET /api/v1/geriatric-comprehensive
 *
 * 权限：geriatric-comprehensive:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCGACountV13,
  computeComprehensiveManagementRateV13,
  computeFallScreeningRateV13,
  type GeriatricComprehensiveRecordV13,
} from "../aggregators/geriatricComprehensiveV13Aggregator.js";

const records: GeriatricComprehensiveRecordV13[] = [
  { cgaCount: 30, fallScreenedCount: 80, geriatricVisits: 100, managedCount: 60 },
  { cgaCount: 30, fallScreenedCount: 80, geriatricVisits: 100, managedCount: 60 },
];

export const geriatricComprehensiveV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/geriatric-comprehensive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "geriatric-comprehensive:read");
      if (denied) return denied;
      return json(ok({
        cgaCount: computeCGACountV13(records),
        fallScreeningRate: computeFallScreeningRateV13(records),
        comprehensiveManagementRate: computeComprehensiveManagementRateV13(records),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 临床路径管理（细节）V13 路由（M414-B，detail 避让旧版 clinicalPathwayMgmtV13）
 *
 * GET /api/v1/clinical-pathway-detail
 *
 * 权限：clinical-pathway-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPathwayCompletionRateV13,
  computeClinicalPathwayEntryRateV13,
  computeClinicalPathwayVariationRateV13,
  type ClinicalPathwayDetailRecordV13,
} from "../aggregators/clinicalPathwayDetailV13Aggregator.js";

const records: ClinicalPathwayDetailRecordV13[] = [
  { entered: 950, shouldEnterTotal: 1000, completed: 900, enteredTotal: 950, variation: 50, pathwayTotal: 1000 },
  { entered: 950, shouldEnterTotal: 1000, completed: 900, enteredTotal: 950, variation: 50, pathwayTotal: 1000 },
];

export const clinicalPathwayDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-pathway-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-pathway-detail:read");
      if (denied) return denied;
      return json(ok({
        clinicalPathwayEntryRate: computeClinicalPathwayEntryRateV13(records),
        clinicalPathwayCompletionRate: computeClinicalPathwayCompletionRateV13(records),
        clinicalPathwayVariationRate: computeClinicalPathwayVariationRateV13(records),
      }));
    },
  },
];

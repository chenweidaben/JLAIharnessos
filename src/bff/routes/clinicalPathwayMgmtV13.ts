/**
 * 健澜科技 jlmedaios - 临床路径管理 V13 路由（M421-D，M421 收官，换名避让旧版 clinicalPathwayDetailV13）
 *
 * GET /api/v1/clinical-pathway-mgmt
 *
 * 权限：clinical-pathway-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPathwayCompletionRateV13,
  computeClinicalPathwayEnrollmentRateV13,
  computeClinicalPathwayVariationRateV13,
  type ClinicalPathwayMgmtRecordV13,
} from "../aggregators/clinicalPathwayMgmtV13Aggregator.js";

const records: ClinicalPathwayMgmtRecordV13[] = [
  { enrolled: 95, shouldEnroll: 100, completed: 90, variation: 5 },
  { enrolled: 95, shouldEnroll: 100, completed: 90, variation: 5 },
];

export const clinicalPathwayMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-pathway-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-pathway-mgmt:read");
      if (denied) return denied;
      return json(ok({
        clinicalPathwayEnrollmentRate: computeClinicalPathwayEnrollmentRateV13(records),
        clinicalPathwayCompletionRate: computeClinicalPathwayCompletionRateV13(records),
        clinicalPathwayVariationRate: computeClinicalPathwayVariationRateV13(records),
      }));
    },
  },
];

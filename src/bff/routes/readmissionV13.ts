/**
 * 健澜科技 jlmedaios - 31 天再入院率 V13 路由（M335-D）
 *
 * GET /api/v1/readmission-stats
 *
 * 权限：readmission-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDiseaseReadmissionRateV13,
  computeOverallReadmissionRateV13,
  type ReadmissionRecordV13,
} from "../aggregators/readmissionV13Aggregator.js";

const records: ReadmissionRecordV13[] = [
  { disease: "心衰", dischargedCount: 200, readmittedCount: 20 },
  { disease: "慢阻肺", dischargedCount: 300, readmittedCount: 10 },
  { disease: "脑梗死", dischargedCount: 500, readmittedCount: 0 },
];

export const readmissionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/readmission-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "readmission-stats:read");
      if (denied) return denied;
      return json(ok({
        overallRate: computeOverallReadmissionRateV13(records),
        diseaseRates: computeDiseaseReadmissionRateV13(records),
      }));
    },
  },
];

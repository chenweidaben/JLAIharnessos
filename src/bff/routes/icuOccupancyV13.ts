/**
 * 健澜科技 jlmedaios - ICU 床位 V13 路由（M335-B）
 *
 * GET /api/v1/icu-occupancy
 *
 * 权限：icu-occupancy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgAPACHEIIV13,
  computeICUBedOccupancyV13,
  computeTransferOutRateV13,
  type ICURecordV13,
} from "../aggregators/icuOccupancyV13Aggregator.js";

const records: ICURecordV13[] = [
  { totalBedDays: 200, occupiedBedDays: 180, apacheIIScore: 15, admittedCount: 30, transferredOutCount: 25 },
  { totalBedDays: 0, occupiedBedDays: 0, apacheIIScore: 18, admittedCount: 0, transferredOutCount: 0 },
  { totalBedDays: 0, occupiedBedDays: 0, apacheIIScore: 12, admittedCount: 0, transferredOutCount: 0 },
];

export const icuOccupancyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/icu-occupancy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "icu-occupancy:read");
      if (denied) return denied;
      return json(ok({
        occupancy: computeICUBedOccupancyV13(records),
        avgApacheII: computeAvgAPACHEIIV13(records),
        transferOutRate: computeTransferOutRateV13(records),
      }));
    },
  },
];

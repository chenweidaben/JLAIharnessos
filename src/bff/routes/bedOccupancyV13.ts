/**
 * 健澜科技 jlmedaios - 床位使用 V13 路由（M345-D）
 *
 * GET /api/v1/bed-occupancy
 *
 * 权限：bed-occupancy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgLosV13,
  computeBedOccupancyRateV13,
  computeBedTurnoverV13,
  type BedOccupancyRecordV13,
} from "../aggregators/bedOccupancyV13Aggregator.js";

const records: BedOccupancyRecordV13[] = [
  { occupiedBedDays: 4500, openBedDays: 5000, avgLos: 8, dischargedPatients: 150, avgBeds: 50 },
  { occupiedBedDays: 4500, openBedDays: 5000, avgLos: 12, dischargedPatients: 150, avgBeds: 50 },
];

export const bedOccupancyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bed-occupancy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bed-occupancy:read");
      if (denied) return denied;
      return json(ok({
        occupancyRate: computeBedOccupancyRateV13(records),
        avgLos: computeAvgLosV13(records),
        turnover: computeBedTurnoverV13(records),
      }));
    },
  },
];

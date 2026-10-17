/**
 * 健澜科技 jlmedaios - 病房床位使用率 V13 路由（M331-A）
 *
 * GET /api/v1/ward-occupancy
 *
 * 权限：ward-occupancy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOverallOccupancyV13,
  computeWardOccupancyV13,
  type WardOccupancyV13,
} from "../aggregators/wardOccupancyV13Aggregator.js";

const wards: WardOccupancyV13[] = [
  { wardName: "心内科", occupiedBedDays: 450, availableBedDays: 500 },
  { wardName: "骨科", occupiedBedDays: 380, availableBedDays: 400 },
  { wardName: "神经内科", occupiedBedDays: 300, availableBedDays: 400 },
];

export const wardOccupancyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ward-occupancy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ward-occupancy:read");
      if (denied) return denied;
      return json(ok({
        wardOccupancy: computeWardOccupancyV13(wards),
        overallOccupancy: computeOverallOccupancyV13(wards),
      }));
    },
  },
];

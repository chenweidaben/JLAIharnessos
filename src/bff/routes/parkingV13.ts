/**
 * 健澜科技 jlmedaios - 停车场使用率 V13 路由（M331-D）
 *
 * GET /api/v1/parking
 *
 * 权限：parking:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeParkingTurnoverV13,
  computeParkingUtilizationV13,
  type ParkingLotV13,
} from "../aggregators/parkingV13Aggregator.js";

const parking: ParkingLotV13[] = [
  { totalSpaces: 200, usedSpaces: 160, parkingCount: 400 },
];

export const parkingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/parking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "parking:read");
      if (denied) return denied;
      return json(ok({
        utilization: computeParkingUtilizationV13(parking),
        turnover: computeParkingTurnoverV13(parking),
      }));
    },
  },
];

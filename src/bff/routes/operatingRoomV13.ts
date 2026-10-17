/**
 * 健澜科技 jlmedaios - 手术室利用率 V13 路由（M331-B）
 *
 * GET /api/v1/operating-room
 *
 * 权限：operating-room:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOperatingRoomUtilizationV13,
  type OperatingRoomV13,
} from "../aggregators/operatingRoomV13Aggregator.js";

const rooms: OperatingRoomV13[] = [
  { roomName: "一号手术间", usedHours: 160, availableHours: 200 },
  { roomName: "二号手术间", usedHours: 180, availableHours: 200 },
  { roomName: "三号手术间", usedHours: 100, availableHours: 200 },
];

export const operatingRoomV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operating-room",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operating-room:read");
      if (denied) return denied;
      return json(ok({
        rooms: computeOperatingRoomUtilizationV13(rooms),
      }));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 电梯等候时间 V13 路由（M331-C）
 *
 * GET /api/v1/elevator-wait-time
 *
 * 权限：elevator-wait-time:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgElevatorWaitV13,
  type ElevatorWaitV13,
} from "../aggregators/elevatorWaitTimeV13Aggregator.js";

const records: ElevatorWaitV13[] = [
  { waitMinutes: 5 },
  { waitMinutes: 3 },
  { waitMinutes: 4 },
  { waitMinutes: 6 },
  { waitMinutes: 2 },
];

export const elevatorWaitTimeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/elevator-wait-time",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "elevator-wait-time:read");
      if (denied) return denied;
      return json(ok({
        avgWaitMinutes: computeAvgElevatorWaitV13(records),
      }));
    },
  },
];

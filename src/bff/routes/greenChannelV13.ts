/**
 * 健澜科技 jlmedaios - 绿色通道 V13 路由（M372-D，M372 收官）
 *
 * GET /api/v1/green-channel
 *
 * 权限：green-channel:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeGreenChannelAverageDurationV13,
  computeGreenChannelRescueSuccessRateV13,
  computeGreenChannelStartCountV13,
  type GreenChannelRecordV13,
} from "../aggregators/greenChannelV13Aggregator.js";

const records: GreenChannelRecordV13[] = [
  { startCount: 10, averageDuration: 30, rescueCount: 100, rescueSuccessCount: 95 },
  { startCount: 10, averageDuration: 30, rescueCount: 100, rescueSuccessCount: 95 },
];

export const greenChannelV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/green-channel",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "green-channel:read");
      if (denied) return denied;
      return json(ok({
        greenChannelStartCount: computeGreenChannelStartCountV13(records),
        greenChannelAverageDuration: computeGreenChannelAverageDurationV13(records),
        greenChannelRescueSuccessRate: computeGreenChannelRescueSuccessRateV13(records),
      }));
    },
  },
];

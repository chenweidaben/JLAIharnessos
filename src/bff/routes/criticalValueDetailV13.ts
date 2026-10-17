/**
 * 健澜科技 jlmedaios - 危急值管理（细节）V13 路由（M425-A，detail 避让旧版 criticalValueMgmtV13（M411））
 *
 * GET /api/v1/critical-value-detail
 *
 * 权限：critical-value-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCriticalValueClosedLoopRateV13,
  computeCriticalValueNotificationTimelyRateV13,
  computeCriticalValueRecordCompleteRateV13,
  type CriticalValueDetailRecordV13,
} from "../aggregators/criticalValueDetailV13Aggregator.js";

const records: CriticalValueDetailRecordV13[] = [
  { timelyNotified: 980, closedLoop: 950, recordComplete: 990, criticalTotal: 1000 },
  { timelyNotified: 980, closedLoop: 950, recordComplete: 990, criticalTotal: 1000 },
];

export const criticalValueDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/critical-value-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "critical-value-detail:read");
      if (denied) return denied;
      return json(ok({
        criticalValueNotificationTimelyRate: computeCriticalValueNotificationTimelyRateV13(records),
        criticalValueClosedLoopRate: computeCriticalValueClosedLoopRateV13(records),
        criticalValueRecordCompleteRate: computeCriticalValueRecordCompleteRateV13(records),
      }));
    },
  },
];

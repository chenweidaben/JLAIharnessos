/**
 * 健澜科技 jlmedaios - 危急值 V13 路由（M335-C）
 *
 * GET /api/v1/critical-value-stats
 *
 * 权限：critical-value-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCriticalValueCountV13,
  computeMissedReportRateV13,
  computeTimelyHandlingRateV13,
  type CriticalValueRecordV13,
} from "../aggregators/criticalValueV13Aggregator.js";

const records: CriticalValueRecordV13[] = [
  { totalCount: 100, timelyHandledCount: 95, missedReportCount: 2 },
];

export const criticalValueV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/critical-value-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "critical-value-stats:read");
      if (denied) return denied;
      return json(ok({
        count: computeCriticalValueCountV13(records),
        timelyHandlingRate: computeTimelyHandlingRateV13(records),
        missedReportRate: computeMissedReportRateV13(records),
      }));
    },
  },
];

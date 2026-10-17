/**
 * 健澜科技 jlmedaios - API 调用量 V13 路由（M344-D）
 *
 * GET /api/v1/api-call
 *
 * 权限：api-call:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDailyAvgV13,
  computeFailureRateV13,
  computePeakV13,
  type ApiCallRecordV13,
} from "../aggregators/apiCallV13Aggregator.js";

const records: ApiCallRecordV13[] = [
  { totalCalls: 100, failedCalls: 1 },
  { totalCalls: 200, failedCalls: 2 },
  { totalCalls: 300, failedCalls: 3 },
];

export const apiCallV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/api-call",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "api-call:read");
      if (denied) return denied;
      return json(ok({
        dailyAvg: computeDailyAvgV13(records),
        peak: computePeakV13(records),
        failureRate: computeFailureRateV13(records),
      }));
    },
  },
];

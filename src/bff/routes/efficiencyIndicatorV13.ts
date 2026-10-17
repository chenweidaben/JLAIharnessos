/**
 * 健澜科技 jlmedaios - 效率指标 V13 路由（M396-D，M396 收官）
 *
 * GET /api/v1/efficiency-indicator
 *
 * 权限：efficiency-indicator:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAverageLOSReductionRateV13,
  computeBedWorkdayUtilizationRateV13,
  computePreopWaitingTimeAvgV13,
  type EfficiencyIndicatorRecordV13,
} from "../aggregators/efficiencyIndicatorV13Aggregator.js";

const records: EfficiencyIndicatorRecordV13[] = [
  { lastLOS: 10, currentLOS: 9.5, preopWaitDays: 150, surgeryCount: 50, occupiedBedDays: 270, calendarDays: 300 },
  { lastLOS: 10, currentLOS: 9.5, preopWaitDays: 150, surgeryCount: 50, occupiedBedDays: 270, calendarDays: 300 },
];

export const efficiencyIndicatorV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/efficiency-indicator",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "efficiency-indicator:read");
      if (denied) return denied;
      return json(ok({
        averageLOSReductionRate: computeAverageLOSReductionRateV13(records),
        preopWaitingTimeAvg: computePreopWaitingTimeAvgV13(records),
        bedWorkdayUtilizationRate: computeBedWorkdayUtilizationRateV13(records),
      }));
    },
  },
];

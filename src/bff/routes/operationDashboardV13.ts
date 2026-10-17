/**
 * 健澜科技 jlmedaios - 运营看板 V13 路由（M381-A）
 *
 * GET /api/v1/operation-dashboard
 *
 * 权限：operation-dashboard:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedOccupancyRateV13,
  computeDailyOutpatientCountV13,
  computeSurgeryCountV13,
  type OperationDashboardRecordV13,
} from "../aggregators/operationDashboardV13Aggregator.js";

const records: OperationDashboardRecordV13[] = [
  { dailyOutpatientCount: 5000, occupiedBedDays: 950, openBedDays: 1000, surgeryCount: 200 },
  { dailyOutpatientCount: 5000, occupiedBedDays: 950, openBedDays: 1000, surgeryCount: 200 },
];

export const operationDashboardV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operation-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operation-dashboard:read");
      if (denied) return denied;
      return json(ok({
        dailyOutpatientCount: computeDailyOutpatientCountV13(records),
        bedOccupancyRate: computeBedOccupancyRateV13(records),
        surgeryCount: computeSurgeryCountV13(records),
      }));
    },
  },
];

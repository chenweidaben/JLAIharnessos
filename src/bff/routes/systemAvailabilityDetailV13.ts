/**
 * 健澜科技 jlmedaios - 系统可用性明细 V13 路由（M379-C，detail 避让）
 *
 * GET /api/v1/system-availability-detail
 *
 * 权限：system-availability-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCoreSystemAvailabilityRateV13,
  computePlannedDowntimeHoursV13,
  computeUnplannedDowntimeCountV13,
  type SystemAvailabilityRecordV13,
} from "../aggregators/systemAvailabilityDetailV13Aggregator.js";

const records: SystemAvailabilityRecordV13[] = [
  { availableHours: 8700, totalAnnualHours: 8760, plannedDowntimeHours: 10, unplannedDowntimeCount: 2 },
  { availableHours: 8700, totalAnnualHours: 8760, plannedDowntimeHours: 10, unplannedDowntimeCount: 2 },
];

export const systemAvailabilityDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/system-availability-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "system-availability-detail:read");
      if (denied) return denied;
      return json(ok({
        coreSystemAvailabilityRate: computeCoreSystemAvailabilityRateV13(records),
        plannedDowntimeHours: computePlannedDowntimeHoursV13(records),
        unplannedDowntimeCount: computeUnplannedDowntimeCountV13(records),
      }));
    },
  },
];

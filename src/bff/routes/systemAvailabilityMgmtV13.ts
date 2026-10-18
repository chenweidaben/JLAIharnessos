/**
 * 健澜科技 jlmedaios - 信息系统可用性管理 V13 路由（M446-A，信息化建设与数据安全管理组）
 *
 * GET /api/v1/system-availability-mgmt
 *
 * 权限：system-availability-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSystemAvailabilityMajorFaultCountV13,
  computeSystemAvailabilityPlannedDowntimeHoursV13,
  computeSystemAvailabilityRateV13,
  type SystemAvailabilityMgmtRecordV13,
} from "../aggregators/systemAvailabilityMgmtV13Aggregator.js";

const records: SystemAvailabilityMgmtRecordV13[] = [
  { availableHours: 950, totalHours: 1000, majorFault: true, plannedDowntimeHours: 1.5 },
  { availableHours: 950, totalHours: 1000, majorFault: true, plannedDowntimeHours: 1.5 },
];

export const systemAvailabilityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/system-availability-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "system-availability-mgmt:read");
      if (denied) return denied;
      return json(ok({
        systemAvailabilityRate: computeSystemAvailabilityRateV13(records),
        systemAvailabilityMajorFaultCount: computeSystemAvailabilityMajorFaultCountV13(records),
        systemAvailabilityPlannedDowntimeHours: computeSystemAvailabilityPlannedDowntimeHoursV13(records),
      }));
    },
  },
];

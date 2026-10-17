/**
 * 健澜科技 jlmedaios - 设备维护统计 V13 路由（M385-B，stats 避让）
 *
 * GET /api/v1/equipment-maintenance-stats
 *
 * 权限：equipment-maintenance-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgFaultResponseHoursV13,
  computeEquipmentGoodRateV13,
  computeEquipmentInspectionCountV13,
  type EquipmentMaintenanceRecordV13,
} from "../aggregators/equipmentMaintenanceStatsV13Aggregator.js";

const records: EquipmentMaintenanceRecordV13[] = [
  { inspectionCount: 100, totalResponseHours: 240, faultCount: 120, goodCount: 950, totalCount: 1000 },
  { inspectionCount: 100, totalResponseHours: 240, faultCount: 120, goodCount: 950, totalCount: 1000 },
];

export const equipmentMaintenanceStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-maintenance-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-maintenance-stats:read");
      if (denied) return denied;
      return json(ok({
        equipmentInspectionCount: computeEquipmentInspectionCountV13(records),
        avgFaultResponseHours: computeAvgFaultResponseHoursV13(records),
        equipmentGoodRate: computeEquipmentGoodRateV13(records),
      }));
    },
  },
];

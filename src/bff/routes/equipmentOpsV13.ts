/**
 * 健澜科技 jlmedaios - 设备运维 V13 路由（M328-A）
 *
 * GET /api/v1/equipment-ops-overview
 *
 * 权限：equipment-ops-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMTBFV13,
  countMaintenanceTasksV13,
  sumDowntimeHoursV13,
  type EquipmentRecordV13,
} from "../aggregators/equipmentOpsV13Aggregator.js";

const records: EquipmentRecordV13[] = [
  { deviceName: "CT", maintenanceCount: 2, downtimeHours: 5, totalRuntimeHours: 500, failureCount: 1 },
  { deviceName: "MRI", maintenanceCount: 2, downtimeHours: 5, totalRuntimeHours: 300, failureCount: 1 },
  { deviceName: "X光机", maintenanceCount: 1, downtimeHours: 0, totalRuntimeHours: 200, failureCount: 0 },
];

export const equipmentOpsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-ops-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-ops-overview:read");
      if (denied) return denied;
      return json(ok({
        maintenanceTasks: countMaintenanceTasksV13(records),
        downtimeHours: sumDowntimeHoursV13(records),
        mtbf: computeMTBFV13(records),
      }));
    },
  },
];

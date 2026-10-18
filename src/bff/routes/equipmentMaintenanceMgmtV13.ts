/**
 * 健澜科技 jlmedaios - 设备维护保养管理 V13 路由（M449-B，医疗装备与设备管理组）
 *
 * GET /api/v1/equipment-maintenance-mgmt
 *
 * 权限：equipment-maintenance-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEquipmentMaintenanceDowntimeRateV13,
  computeEquipmentMaintenancePreventivePlanCompletionRateV13,
  computeEquipmentMaintenanceRepairTimelinessRateV13,
  type EquipmentMaintenanceMgmtRecordV13,
} from "../aggregators/equipmentMaintenanceMgmtV13Aggregator.js";

const records: EquipmentMaintenanceMgmtRecordV13[] = [
  { preventiveDone: 950, preventivePlanned: 1000, downtimeHours: 30, totalHours: 1000, repairTimely: 900, totalFault: 1000 },
  { preventiveDone: 950, preventivePlanned: 1000, downtimeHours: 30, totalHours: 1000, repairTimely: 900, totalFault: 1000 },
];

export const equipmentMaintenanceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-maintenance-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-maintenance-mgmt:read");
      if (denied) return denied;
      return json(ok({
        equipmentMaintenancePreventivePlanCompletionRate: computeEquipmentMaintenancePreventivePlanCompletionRateV13(records),
        equipmentMaintenanceDowntimeRate: computeEquipmentMaintenanceDowntimeRateV13(records),
        equipmentMaintenanceRepairTimelinessRate: computeEquipmentMaintenanceRepairTimelinessRateV13(records),
      }));
    },
  },
];

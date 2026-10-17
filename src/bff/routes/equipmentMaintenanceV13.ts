/**
 * 健澜科技 jlmedaios - 医疗设备维保到期提醒 V13 路由（M313-C）
 *
 * GET /api/v1/equipment-maintenance?today=
 *
 * 权限：equipment-maintenance:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  checkMaintenanceDueV13,
  classifyMaintenanceUrgencyV13,
  detectOverdueMaintenanceV13,
  type MedicalDeviceV13,
} from "../aggregators/equipmentMaintenanceV13Aggregator.js";

const devices: MedicalDeviceV13[] = [
  { deviceId: "d1", name: "CT", nextMaintenance: "2026-11-01" },
  { deviceId: "d2", name: "MRI", nextMaintenance: "2026-12-01" },
  { deviceId: "d3", name: "X光机", nextMaintenance: "2026-09-30" },
];

export const equipmentMaintenanceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-maintenance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-maintenance:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const today = url.searchParams.get("today") ?? "2026-10-17";
      return json(ok({
        today,
        board: devices.map((d) => {
          const daysLeft = checkMaintenanceDueV13(d, today);
          return {
            deviceId: d.deviceId,
            name: d.name,
            daysLeft,
            urgency: classifyMaintenanceUrgencyV13(daysLeft),
          };
        }),
        overdue: detectOverdueMaintenanceV13(devices, today),
      }));
    },
  },
];

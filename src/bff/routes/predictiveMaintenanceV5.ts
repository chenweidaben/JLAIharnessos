/**
 * 健澜科技 jlmedaios - 设备预测性维护 V5 路由（M279-C）
 *
 * GET  /api/v1/predictive-maintenance（设备健康看板）
 * POST /api/v1/predictive-maintenance/work-order（保养工单）
 * GET  /api/v1/predictive-maintenance/predict（故障预测）
 *
 * 权限：predictive-maintenance:read / predictive-maintenance:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPredictiveMaintenanceV5Report,
  predictFailureV5,
  scheduleMaintenanceV5,
  type Equipment,
} from "../aggregators/predictiveMaintenanceV5Aggregator.js";

const AVG_INTERVAL = 1000;

const equipmentStore: Equipment[] = [
  { equipmentId: "ct-01", name: "CT", installDate: "2022-01-01", warrantyExpiry: "2027-01-01", runtimeHours: 2500, lastFailureHours: 1600, nextServiceDue: 3000 },
  { equipmentId: "mr-01", name: "MRI", installDate: "2021-06-01", warrantyExpiry: "2026-06-01", runtimeHours: 3200, lastFailureHours: 2100, nextServiceDue: 3100 },
];

export const predictiveMaintenanceV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/predictive-maintenance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "predictive-maintenance:read");
      if (denied) return denied;

      return json(ok(buildPredictiveMaintenanceV5Report(equipmentStore, AVG_INTERVAL)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/predictive-maintenance/work-order",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "predictive-maintenance:write");
      if (denied) return denied;

      const body = await c.req.json() as { equipmentId: string };
      const eq = equipmentStore.find((e) => e.equipmentId === body.equipmentId);
      if (!eq) {
        return json(ok({ found: false }));
      }
      const schedule = scheduleMaintenanceV5(eq, AVG_INTERVAL);
      return json(ok({ found: true, workOrder: { equipmentId: schedule.equipmentId, priority: schedule.priority, dueHours: schedule.dueHours } }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/predictive-maintenance/predict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "predictive-maintenance:read");
      if (denied) return denied;

      const id = c.query.get("equipmentId") ?? "";
      const eq = equipmentStore.find((e) => e.equipmentId === id);
      if (!eq) {
        return json(ok({ found: false }));
      }
      return json(ok(predictFailureV5(eq, AVG_INTERVAL)));
    },
  },
];

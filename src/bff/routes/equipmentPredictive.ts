/**
 * 健澜科技 jlmedaios - 设备预测性维护路由（M184-C）
 *
 * GET /api/v1/equipment/predictive?equipmentId=xxx
 *
 * 权限：equipment:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import {
  predictEquipmentFailure,
  schedulePreventiveMaintenance,
  type EquipmentHistory,
} from '../aggregators/equipmentPredictiveAggregator.js';

/** 演示设备库 */
const DEMO_EQUIPMENT: Record<string, EquipmentHistory> = {
  'ct-001': { totalRunHours: 65000, recentFailures: 3, daysSinceLastMaintenance: 200, ageYears: 12 },
  'mri-001': { totalRunHours: 30000, recentFailures: 0, daysSinceLastMaintenance: 60, ageYears: 5 },
  'xray-001': { totalRunHours: 15000, recentFailures: 1, daysSinceLastMaintenance: 120, ageYears: 3 },
};

export const equipmentPredictiveRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/equipment/predictive',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'equipment:view');
      if (denied) return denied;

      const equipmentId = c.query.get('equipmentId') ?? 'ct-001';
      const history = DEMO_EQUIPMENT[equipmentId] ?? DEMO_EQUIPMENT['ct-001'];

      const prediction = predictEquipmentFailure(equipmentId, history);
      const schedule = schedulePreventiveMaintenance(equipmentId, prediction);

      return json(ok({ prediction, schedule }));
    },
  },
];

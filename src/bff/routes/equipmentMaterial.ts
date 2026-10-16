/**
 * 健澜科技 jlmedaios - 设备物资管理路由（M191-D）
 *
 * GET /api/v1/admin/equipment-material/report
 *
 * 权限：equipment_material:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEquipmentMaterialReport } from '../aggregators/equipmentMaterialAggregator.js';

export const equipmentMaterialRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/equipment-material/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'equipment_material:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '设备科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEquipmentMaterialReport(dept, timeRange);
      return json(ok(result));
    },
  },
];

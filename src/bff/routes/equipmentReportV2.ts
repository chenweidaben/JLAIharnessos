/**
 * 健澜科技 jlmedaios - 设备 V2 路由（M213-A）
 *
 * GET /api/v1/equipment/report-v2
 *
 * 权限：equipment:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEquipmentReportV2 } from '../aggregators/equipmentReportV2Aggregator.js';

export const equipmentReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/equipment/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'equipment:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEquipmentReportV2(timeRange);
      return json(ok(result));
    },
  },
];

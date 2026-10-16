/**
 * 健澜科技 jlmedaios - 特种设备与危化品路由（M229-C）
 *
 * GET /api/v1/special-equip-hazmat/report
 *
 * 权限：special-equip-hazmat:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSpecialEquipHazmatReport } from '../aggregators/specialEquipHazmatReportAggregator.js';

export const specialEquipHazmatReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/special-equip-hazmat/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'special-equip-hazmat:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSpecialEquipHazmatReport(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 质量管理路由（M189-C）
 *
 * GET /api/v1/admin/quality-management/report
 *
 * 权限：quality_mgmt:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildQualityManagementReport } from '../aggregators/qualityManagementAggregator.js';

export const qualityManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/quality-management/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'quality_mgmt:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '心内科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildQualityManagementReport(dept, timeRange);
      return json(ok(result));
    },
  },
];

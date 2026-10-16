/**
 * 健澜科技 jlmedaios - 质量管理体系路由（M193-C）
 *
 * GET /api/v1/admin/quality-system/report
 *
 * 权限：quality_system:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildQualitySystemReport } from '../aggregators/qualitySystemAggregator.js';

export const qualitySystemRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/quality-system/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'quality_system:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '质控科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildQualitySystemReport(dept, timeRange);
      return json(ok(result));
    },
  },
];

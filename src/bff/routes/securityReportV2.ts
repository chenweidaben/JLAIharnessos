/**
 * 健澜科技 jlmedaios - 安全加固路由 V2（M187-B）
 *
 * GET /api/v1/admin/security/report-v2
 *
 * 权限：security:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSecurityReport } from '../aggregators/securityReportAggregator.js';

export const securityReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'security:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '24h';
      const result = buildSecurityReport(timeRange);
      return json(ok(result));
    },
  },
];

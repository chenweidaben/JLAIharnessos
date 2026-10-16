/**
 * 健澜科技 jlmedaios - 国际化路由（M199-D）
 *
 * GET /api/v1/admin/internationalization/report
 *
 * 权限：i18n:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInternationalizationReport } from '../aggregators/internationalizationAggregator.js';

export const internationalizationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/internationalization/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'i18n:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInternationalizationReport(timeRange);
      return json(ok(result));
    },
  },
];

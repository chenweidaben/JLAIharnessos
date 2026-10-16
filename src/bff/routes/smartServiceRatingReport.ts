/**
 * 健澜科技 jlmedaios - 智慧服务评级路由（M218-D）
 *
 * GET /api/v1/smart-service/report
 *
 * 权限：smart_service:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSmartServiceRatingReport } from '../aggregators/smartServiceRatingReportAggregator.js';

export const smartServiceRatingReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/smart-service/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'smart_service:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSmartServiceRatingReport(timeRange);
      return json(ok(result));
    },
  },
];

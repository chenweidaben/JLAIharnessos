/**
 * 健澜科技 jlmedaios - 文化品牌路由（M213-D）
 *
 * GET /api/v1/culture-brand/report
 *
 * 权限：culture_brand:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildCultureBrandReport } from '../aggregators/cultureBrandReportAggregator.js';

export const cultureBrandReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/culture-brand/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'culture_brand:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildCultureBrandReport(timeRange);
      return json(ok(result));
    },
  },
];

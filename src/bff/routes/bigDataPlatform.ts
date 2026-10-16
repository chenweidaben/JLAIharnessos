/**
 * 健澜科技 jlmedaios - 大数据平台路由（M196-A）
 *
 * GET /api/v1/admin/big-data/report
 *
 * 权限：big_data:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildBigDataPlatformReport } from '../aggregators/bigDataPlatformAggregator.js';

export const bigDataPlatformRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/big-data/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'big_data:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildBigDataPlatformReport(timeRange);
      return json(ok(result));
    },
  },
];

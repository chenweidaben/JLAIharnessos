/**
 * 健澜科技 jlmedaios - 文化品牌 V2 路由（M228-B）
 *
 * GET /api/v1/culture-brand/report-v2
 *
 * 权限：culture-brand:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildCultureBrandReportV2 } from '../aggregators/cultureBrandReportV2Aggregator.js';

export const cultureBrandReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/culture-brand/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'culture-brand:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildCultureBrandReportV2(timeRange);
      return json(ok(result));
    },
  },
];

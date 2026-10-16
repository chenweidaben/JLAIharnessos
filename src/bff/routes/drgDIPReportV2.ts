/**
 * 健澜科技 jlmedaios - DRG/DIP V2 路由（M230-C）
 *
 * GET /api/v1/drg-dip/report-v2
 *
 * 权限：drg-dip:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDRGDIPReportV2 } from '../aggregators/drgDIPReportV2Aggregator.js';

export const drgDIPReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/drg-dip/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'drg-dip:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDRGDIPReportV2(timeRange);
      return json(ok(result));
    },
  },
];

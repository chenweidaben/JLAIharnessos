/**
 * 健澜科技 jlmedaios - 大数据 V2 路由（M215-A）
 *
 * GET /api/v1/big-data/report-v2
 *
 * 权限：big_data:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildBigDataReportV2 } from '../aggregators/bigDataReportV2Aggregator.js';

export const bigDataReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/big-data/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'big_data:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildBigDataReportV2(timeRange);
      return json(ok(result));
    },
  },
];

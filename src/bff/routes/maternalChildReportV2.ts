/**
 * 健澜科技 jlmedaios - 妇幼健康 V2 路由（M221-B）
 *
 * GET /api/v1/maternal-child/report-v2
 *
 * 权限：maternal_child:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMaternalChildReportV2 } from '../aggregators/maternalChildReportV2Aggregator.js';

export const maternalChildReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/maternal-child/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'maternal_child:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMaternalChildReportV2(timeRange);
      return json(ok(result));
    },
  },
];

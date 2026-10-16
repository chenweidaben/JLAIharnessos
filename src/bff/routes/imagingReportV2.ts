/**
 * 健澜科技 jlmedaios - 影像中心 V2 路由（M223-B）
 *
 * GET /api/v1/imaging/report-v2
 *
 * 权限：imaging:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildImagingReportV2 } from '../aggregators/imagingReportV2Aggregator.js';

export const imagingReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/imaging/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'imaging:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildImagingReportV2(timeRange);
      return json(ok(result));
    },
  },
];

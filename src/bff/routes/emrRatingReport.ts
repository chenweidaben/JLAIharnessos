/**
 * 健澜科技 jlmedaios - EMR 评级路由（M210-C）
 *
 * GET /api/v1/emr-rating/report
 *
 * 权限：emr_rating:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEMRRatingReport } from '../aggregators/emrRatingReportAggregator.js';

export const emrRatingReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emr-rating/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'emr_rating:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEMRRatingReport(timeRange);
      return json(ok(result));
    },
  },
];

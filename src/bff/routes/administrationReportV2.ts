/**
 * 健澜科技 jlmedaios - 行政办公 V2 路由（M228-C）
 *
 * GET /api/v1/administration/report-v2
 *
 * 权限：administration:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAdministrationReportV2 } from '../aggregators/administrationReportV2Aggregator.js';

export const administrationReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/administration/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'administration:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAdministrationReportV2(timeRange);
      return json(ok(result));
    },
  },
];

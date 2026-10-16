/**
 * 健澜科技 jlmedaios - 病理中心 V2 路由（M223-C）
 *
 * GET /api/v1/pathology/report-v2
 *
 * 权限：pathology:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPathologyReportV2 } from '../aggregators/pathologyReportV2Aggregator.js';

export const pathologyReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pathology/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'pathology:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPathologyReportV2(timeRange);
      return json(ok(result));
    },
  },
];

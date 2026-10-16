/**
 * 健澜科技 jlmedaios - 检验检查 V3 路由（M204-D）
 *
 * GET /api/v1/lab-imaging/report-v3
 *
 * 权限：lab_imaging:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLabImagingReportV3 } from '../aggregators/labImagingReportV3Aggregator.js';

export const labImagingReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/lab-imaging/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'lab_imaging:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLabImagingReportV3(timeRange);
      return json(ok(result));
    },
  },
];

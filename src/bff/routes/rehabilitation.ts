/**
 * 健澜科技 jlmedaios - 康复专科路由（M202-A）
 *
 * GET /api/v1/specialty/rehabilitation/report
 *
 * 权限：rehabilitation:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildRehabilitationReport } from '../aggregators/rehabilitationAggregator.js';

export const rehabilitationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/rehabilitation/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'rehabilitation:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '康复医学科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildRehabilitationReport(dept, timeRange);
      return json(ok(result));
    },
  },
];

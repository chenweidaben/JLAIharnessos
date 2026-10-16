/**
 * 健澜科技 jlmedaios - 检验检查智能审核路由（M190-A）
 *
 * GET /api/v1/lab-imaging/audit/report
 *
 * 权限：lab_imaging_audit:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLabImagingAuditReport } from '../aggregators/labImagingAuditAggregator.js';

export const labImagingAuditRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/lab-imaging/audit/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'lab_imaging_audit:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '检验科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLabImagingAuditReport(dept, timeRange);
      return json(ok(result));
    },
  },
];

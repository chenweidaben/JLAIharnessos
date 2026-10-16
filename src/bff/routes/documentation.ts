/**
 * 健澜科技 jlmedaios - 文档路由（M200-B）
 *
 * GET /api/v1/admin/documentation/report
 *
 * 权限：documentation:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDocumentationReport } from '../aggregators/documentationAggregator.js';

export const documentationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/documentation/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'documentation:view');
      if (denied) return denied;

      const result = buildDocumentationReport();
      return json(ok(result));
    },
  },
];

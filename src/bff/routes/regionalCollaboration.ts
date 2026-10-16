/**
 * 健澜科技 jlmedaios - 区域协同分级诊疗路由（M186-C）
 *
 * GET /api/v1/regional/collaboration?region=xxx
 *
 * 权限：regional:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildRegionalCollaboration } from '../aggregators/regionalCollaborationAggregator.js';

export const regionalCollaborationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/regional/collaboration',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'regional:view');
      if (denied) return denied;

      const region = c.query.get('region') ?? '默认区域';
      const result = buildRegionalCollaboration(region, '2026-10-16');
      return json(ok(result));
    },
  },
];

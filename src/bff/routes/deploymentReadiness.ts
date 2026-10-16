/**
 * 健澜科技 jlmedaios - 部署准备路由（M200-C）
 *
 * GET /api/v1/admin/deployment/readiness
 *
 * 权限：deployment:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDeploymentReadinessReport } from '../aggregators/deploymentReadinessAggregator.js';

export const deploymentReadinessRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/deployment/readiness',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'deployment:view');
      if (denied) return denied;

      const result = buildDeploymentReadinessReport();
      return json(ok(result));
    },
  },
];

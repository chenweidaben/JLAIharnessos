/**
 * 健澜科技 jlmedaios - 区块链路由（M196-D）
 *
 * GET /api/v1/admin/blockchain/report
 *
 * 权限：blockchain:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildBlockchainReport } from '../aggregators/blockchainAggregator.js';

export const blockchainRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/blockchain/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'blockchain:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildBlockchainReport(timeRange);
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 区块链路由（M215-D）
 *
 * GET /api/v1/blockchain/report
 *
 * 权限：blockchain:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildBlockchainReport } from '../aggregators/blockchainReportAggregator.js';

export const blockchainReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/blockchain/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'blockchain:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildBlockchainReport(timeRange);
      return json(ok(result));
    },
  },
];

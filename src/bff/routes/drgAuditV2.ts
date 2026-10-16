/**
 * 健澜科技 jlmedaios - DRG 智能审核 V2 路由（M187-D）
 *
 * GET /api/v1/drg/audit/report-v2
 *
 * 权限：drg_audit:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDRGAuditReport } from '../aggregators/drgAuditV2Aggregator.js';

export const drgAuditV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/drg/audit/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'drg_audit:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDRGAuditReport(timeRange);
      return json(ok(result));
    },
  },
];

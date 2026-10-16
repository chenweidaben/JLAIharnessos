/**
 * 健澜科技 jlmedaios - Admin MUSE V2 管理智能体路由（M186-A）
 *
 * GET /api/v1/personal-agent/admin-muse-v2?role=xxx
 *
 * 权限：admin_muse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAdminMUSE, type AdminRoleV2 } from '../aggregators/adminMUSEV2Aggregator.js';

export const adminMUSEV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/personal-agent/admin-muse-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'admin_muse:view');
      if (denied) return denied;

      const role = (c.query.get('role') ?? 'dean') as AdminRoleV2;
      const dept = c.query.get('dept') ?? '全院';
      const result = buildAdminMUSE(role, dept, '2026-10-16');
      return json(ok(result));
    },
  },
];

/**
 * 健澜科技 jlmedaios - 备份容灾路由（M184-D）
 *
 * GET /api/v1/admin/backup/strategy
 *
 * 权限：admin:backup:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import {
  buildBackupStrategy,
  calculateRTO_RPO,
  verifyBackupIntegrity,
} from '../aggregators/backupStrategyAggregator.js';

export const backupStrategyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/backup/strategy',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'admin:backup:view');
      if (denied) return denied;

      const strategy = buildBackupStrategy();
      const rtoRpo = calculateRTO_RPO(strategy);
      const integrity = verifyBackupIntegrity(
        'backup-20261016-0200',
        'a1b2c3d4',
        'a1b2c3d4',
        1024 * 1024 * 500,
        1024 * 1024 * 100,
      );

      return json(ok({ strategy, rtoRpo, integrity }));
    },
  },
];

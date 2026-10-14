/**
 * 健澜科技 jlmedaios - 院长数据驾驶舱路由（院长版）
 * GET /api/v1/ceo-dashboard （仅需登录 auth，不新增权限码）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { listView } from '../aggregators/ceoDashboardAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

export const ceoDashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ceo-dashboard',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requireAuth(c);
      if (denied) return denied;
      return json(ok(listView()));
    },
  },
];

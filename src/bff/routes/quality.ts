/**
 * 健澜科技数智医院智能体 - BFF 质控路由
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, type RouteDef } from '../types';

export const qualityRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/quality/tasks',
    handle: () => json(ok({ list: [], total: 0, page: 1, pageSize: 10, totalPages: 0 })),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/quality/check/medical-record',
    handle: () => json(ok({ passed: true, score: 92, defects: [] })),
    auth: true,
  },
];

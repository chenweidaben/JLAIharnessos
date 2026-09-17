/**
 * 健澜科技数智医院智能体 - BFF 运营分析路由
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, type RouteDef } from '../types';

export const operationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/operation/analysis',
    handle: () =>
      json(
        ok({
          period: '近14天',
          outpatientVisits: [],
          inpatientAdmissions: [],
          revenue: [],
          departmentRanking: [],
        }),
      ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/operation/drg-dip',
    handle: () => json(ok({ groupRate: 91.6, caseCount: 1240, netBalance: 326.5 })),
    auth: true,
  },
];

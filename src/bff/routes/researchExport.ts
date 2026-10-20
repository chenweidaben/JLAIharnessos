/**
 * 健澜科技 jlmedaios - 科研队列导出
 *
 * 提供科研专病队列数据导出能力。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/research/export
 * 科研队列导出
 */
async function handleResearchExport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const cohorts = [
    {
      name: '冠心病队列',
      enrolled: 120,
      followUpRate: '85%',
      primaryEndpointEvents: 8,
      exportStatus: 'ready',
    },
    {
      name: '高血压队列',
      enrolled: 200,
      followUpRate: '92%',
      primaryEndpointEvents: 5,
      exportStatus: 'ready',
    },
    {
      name: '糖尿病队列',
      enrolled: 150,
      followUpRate: '78%',
      primaryEndpointEvents: 12,
      exportStatus: 'processing',
    },
  ];

  const result = {
    cohorts,
    totalCohorts: cohorts.length,
    totalEnrolled: cohorts.reduce((sum, c) => sum + c.enrolled, 0),
  };

  return json(ok(result));
}

export const researchExportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/research/export',
    handle: handleResearchExport,
    auth: true,
  },
];

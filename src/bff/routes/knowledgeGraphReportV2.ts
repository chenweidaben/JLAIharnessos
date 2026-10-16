/**
 * 健澜科技 jlmedaios - 知识图谱 V2 路由（M208-D）
 *
 * GET /api/v1/knowledge-graph/report-v2
 *
 * 权限：knowledge_graph:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildKnowledgeGraphReportV2 } from '../aggregators/knowledgeGraphReportV2Aggregator.js';

export const knowledgeGraphReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/knowledge-graph/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'knowledge_graph:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildKnowledgeGraphReportV2(timeRange);
      return json(ok(result));
    },
  },
];

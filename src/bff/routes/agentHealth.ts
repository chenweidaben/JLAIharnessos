/**
 * MEDMUSE Agent 健康度看板 BFF 路由。
 *
 * GET /api/v1/medmuse/agent-health
 *  - 仅登录鉴权（auth:true，未登录 401）；不新增/复用业务权限码；
 *  - 返回进程内今日内存计数聚合的健康看板：每 agent 调用数 / 平均响应 / 失败率 / 熔断状态 -> overall；
 *  - 统计由 agents/agentMetrics 的 recordCall 写入，本路由只读快照，不做任何副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import { buildHealthBoard, takeSnapshot } from '../agents/agentMetrics';

export const agentHealthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medmuse/agent-health',
    auth: true,
    handle: async (c: Ctx) => {
      try {
        const board = buildHealthBoard(takeSnapshot());
        return json(ok(board, 'ok', c.traceId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Agent 健康度看板采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];

/**
 * 健澜科技数智医院智能体 - BFF 系统管理路由
 *
 * 安全要点：
 *  - /system/monitor 含敏感运行指标，仅 admin 角色可访问
 *  - /health 与 /ready 为公开就绪探针（不泄露敏感信息）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, json, ok, type RouteDef } from '../types';

export const systemRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/system/config',
    handle: () =>
      json(
        ok({
          siteName: '健澜科技数智医院智能体',
          version: '0.1.0',
          enableDesensitization: true,
          enableCds: true,
          enableStreaming: true,
        }),
      ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/system/monitor',
    handle: (c: Ctx) => {
      // 仅 admin 可查看运行指标
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      return json(
        ok({
          cpuUsage: 23,
          memoryUsage: 61,
          wsConnections: 0,
          activeSessions: 0,
          uptimeSeconds: 0,
        }),
      );
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/system/health',
    handle: () => json(ok({ status: 'healthy', version: '0.1.0', uptimeSeconds: 0, checks: [] })),
  },
  // K8s/负载均衡就绪探针（公开，不泄露敏感信息）
  {
    method: 'GET',
    path: '/ready',
    handle: () => json(ok({ status: 'ready' })),
  },
  {
    method: 'GET',
    path: '/health',
    handle: () => new Response('ok', { status: 200 }),
  },
];

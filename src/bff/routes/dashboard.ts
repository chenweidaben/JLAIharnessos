/**
 * 健澜科技数智医院智能体 - BFF 院长驾驶舱路由（M9-A）
 *
 * v5.0试点扩展（M185bug修复）：
 *  - 兼容 /api/v1/dashboard/summary 别名（部分前端/探测脚本使用此路径），
 *    与 /api/v1/dashboard/stats 共享同一聚合器，避免 404 被误判为 BFF 不可用。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { aggregateDashboard } from '../aggregators/dashboardAggregator';
import { withCache } from '../middleware/cache';
import { json, ok, type Ctx, type RouteDef } from '../types';

async function handleStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const days = Number(c.query.get('days') ?? '14');
  const trendDays = Number.isFinite(days) && days >= 1 ? Math.min(days, 90) : 14;
  // M189: 缓存 30 秒，避免每次请求都重新聚合
  const stats = await withCache(`dashboard:stats:${trendDays}`, 30_000, () =>
    aggregateDashboard(trendDays),
  );
  return json(ok(stats));
}

export const dashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/dashboard/stats',
    handle: handleStats,
    auth: true,
  },
  // v5.0试点扩展（M185bug修复）：summary 别名，避免 e2e/前端探测 404
  {
    method: 'GET',
    path: '/api/v1/dashboard/summary',
    handle: handleStats,
    auth: true,
  },
];

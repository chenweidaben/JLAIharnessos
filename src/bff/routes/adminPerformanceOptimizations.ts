/**
 * 健澜科技 jlmedaios - 系统性能优化 BFF 路由（M128-D）
 *
 * 【移动端+性能优化】
 *
 * GET /api/v1/admin/performance/optimizations
 *  - auth: true + requirePermissionCode('system:performance:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 返回：推荐索引清单（与 249 迁移对齐）+ BFF 进程内缓存命中率统计；
 *  - 索引清单经 buildQueryWithCache 包装（TTL 60s），避免移动端高频轮询
 *    管理面板时重复构造静态数据。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不暴露底层 SQL 文本与参数，不含 PII；
 *  - 采集失败时返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何状态变更副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildQueryWithCache,
  getPerformanceCacheStats,
  PERFORMANCE_INDEX_RECOMMENDATIONS,
  type IndexRecommendation,
} from '../aggregators/performanceOptimizationAggregator';

/** 索引清单缓存 TTL（ms）：静态数据，60s 足够抵御移动端轮询抖动 */
const INDEX_CACHE_TTL_MS = 60_000;
const INDEX_CACHE_KEY = 'admin:performance:index-recommendations';

/** 路由聚合返回体 */
export interface PerformanceOptimizationsView {
  indexRecommendations: IndexRecommendation[];
  cache: ReturnType<typeof getPerformanceCacheStats>;
}

export const adminPerformanceOptimizationsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/optimizations',
    auth: true,
    handle: async (c: Ctx) => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'system:performance:view');
      if (denied) return denied;
      try {
        // 【移动端+性能优化】静态索引清单走 BFF TTL 缓存，移动端轮询不重复构造
        const recommendations = await buildQueryWithCache<IndexRecommendation[]>(
          INDEX_CACHE_KEY,
          () => PERFORMANCE_INDEX_RECOMMENDATIONS.slice(),
          INDEX_CACHE_TTL_MS,
        );
        const view: PerformanceOptimizationsView = {
          indexRecommendations: recommendations,
          cache: getPerformanceCacheStats(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '性能优化数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];

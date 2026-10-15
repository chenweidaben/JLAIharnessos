/**
 * 健澜科技 jlmedaios - 慢查询治理 BFF 路由（M136-B）
 *
 * 【性能优化 · 慢查询治理】
 *
 * GET /api/v1/admin/test/performance/optimizations
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403（依据宪法第三章）；
 *  - Query 参数：
 *      * thresholdMs=N   慢路由 P95 阈值（默认 300，夹取 [50,5000]）
 *      * routes=p1,p2    自定义受测路径（缺省走 health / model-info 轻量端点）
 *      * sql=...         可选：对给定 SQL 文本做静态优化建议（索引 / 缓存 / N+1）
 *  - 返回：
 *      * slowRoutes      经 identifySlowRoutes 筛出的 P95 > thresholdMs 路由（降序）
 *      * sqlOptimizations 经 optimizeQueryPerformance 输出的建议清单（未传 sql 为空）
 *      * cache           本模块进程内缓存命中率观测
 *
 * 生产安全加固：
 *  - 基准采样 + 慢路由识别整体包在 withQueryCache（TTL 60s）中，admin 面板轮询
 *    不会每次回环压测，命中即返回缓存副本；
 *  - 只读聚合结果，不执行传入的 sql、不暴露参数值 / PII；
 *  - 采集失败返回 500 结构化错误信封，不返回 HTML 错误页；
 *  - 仅 GET，无任何状态变更副作用，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  benchmarkApi,
  type BenchmarkResult,
  type BenchmarkRouteSpec,
} from '../aggregators/performanceBenchmarkAggregator';
import {
  DEFAULT_SLOW_ROUTE_THRESHOLD_MS,
  getQueryCacheStats,
  identifySlowRoutes,
  optimizeQueryPerformance,
  withQueryCache,
  type Optimization,
  type RouteBenchmarkPoint,
  type SlowRoute,
} from '../aggregators/queryOptimizationAggregator';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

/** 基准采样缓存 TTL（ms）：60s 内重复轮询直接命中，不回环压测 */
const BENCH_CACHE_TTL_MS = 60_000;
const BENCH_CACHE_KEY = 'admin:test:performance:optimizations:bench';

/** 默认受测路由清单（与 performanceBenchmark 路由保持一致的轻量公开端点） */
const DEFAULT_BENCH_ROUTES: readonly BenchmarkRouteSpec[] = [
  { path: '/api/v1/health', label: '健康检查' },
  { path: '/api/v1/model-info', label: '模型信息' },
];

/** 路由聚合返回体 */
export interface QueryOptimizationsView {
  generatedAt: string;
  thresholdMs: number;
  slowRoutes: SlowRoute[];
  sqlOptimizations: Optimization[];
  cache: ReturnType<typeof getQueryCacheStats>;
}

/** 解析逗号分隔的受测路径清单（缺省回退默认清单，自动补 /api/v1 前缀） */
function parseRoutes(query: URLSearchParams): BenchmarkRouteSpec[] {
  const raw = query.get('routes');
  if (!raw) return DEFAULT_BENCH_ROUTES.map((r) => ({ ...r }));
  const seen = new Set<string>();
  const out: BenchmarkRouteSpec[] = [];
  for (const piece of raw.split(',')) {
    const path = piece.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({ path: path.startsWith('/') ? path : `/api/v1/${path}`, label: path });
  }
  return out.length > 0 ? out : DEFAULT_BENCH_ROUTES.map((r) => ({ ...r }));
}

/** 解析数字 Query 参数并夹取到合法区间 */
function parseBoundedInt(
  query: URLSearchParams,
  key: string,
  def: number,
  min: number,
  max: number,
): number {
  const v = Number(query.get(key));
  if (!Number.isFinite(v)) return def;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

export const queryOptimizationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/test/performance/optimizations',
    auth: true,
    handle: async (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      try {
        const thresholdMs = parseBoundedInt(
          c.query,
          'thresholdMs',
          DEFAULT_SLOW_ROUTE_THRESHOLD_MS,
          50,
          5000,
        );
        const routes = parseRoutes(c.query);
        const sql = c.query.get('sql') ?? '';

        // 【性能优化】基准采样 + 慢路由识别整体走 60s TTL 缓存，面板轮询不重复压测
        const slowRoutes = await withQueryCache<SlowRoute[]>(
          BENCH_CACHE_KEY,
          async () => {
            const baseUrl = new URL(c.req.url).origin;
            const results: BenchmarkResult[] = await benchmarkApi(baseUrl, routes, 5);
            // BenchmarkResult 结构与 RouteBenchmarkPoint 兼容，直接喂给纯函数识别
            const points = results as unknown as RouteBenchmarkPoint[];
            return identifySlowRoutes(points, thresholdMs);
          },
          BENCH_CACHE_TTL_MS,
        );

        // SQL 静态分析不缓存（输入随调用变化），纯函数、不执行 SQL
        const sqlOptimizations = optimizeQueryPerformance(sql);

        const view: QueryOptimizationsView = {
          generatedAt: new Date().toISOString(),
          thresholdMs,
          slowRoutes,
          sqlOptimizations,
          cache: getQueryCacheStats(),
        };
        return json(ok(view));
      } catch (err) {
        const message = err instanceof Error ? err.message : '慢查询治理数据采集失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];

/**
 * 健澜科技 jlmedaios - API 性能基准测试（仅 admin）
 *
 * M149-C 生产质量门禁：P95 < 500ms、错误率 < 0.1%。
 *
 * GET /api/v1/admin/performance/benchmark
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403（依据宪法第三章）；
 *  - 纯函数 benchmarkAllApis() 产出确定性种子模拟指标（P50/P95/P99、
 *    吞吐 req/s、错误率），并与 PERFORMANCE_BASELINE 做版本漂移对比；
 *  - 不发起真实回环压测、不读数据库、不触碰 WebSocket。
 *
 * 历史端点（M135-C，保留供慢查询治理路由复用）：
 * GET /api/v1/admin/test/performance
 *
 * 行为约定：
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403（依据宪法第三章）；
 *  - 对本 BFF 自身发起轻量 GET 采样（server 端 fetch 回环），
 *    统计 P50/P95/P99、错误率与吞吐，并与内置基线对比；
 *  - 受测目标默认选择公开轻量端点（health / model-info）：
 *    回环请求不带调用方会话凭证，admin 端点会被 401 拦截并计入错误率，
 *    因此默认清单不含鉴权端点；如需加压鉴权端点，由调用方在
 *    内网压测环境另行扩展；
 *  - Query 参数：
 *      * routes=路径1,路径2   自定义受测路径（覆盖默认清单）
 *      * concurrency=N        单路由并发上限（默认 5，夹取 [1,50]）
 *      * samples=N            每路由采样次数（默认 10，夹取 [1,100]）
 *
 * 用途：发版前快速验证「生产就绪质量门禁」（P95 ≤ 500ms、错误率 ≤ 1%），
 *       并留档基线用于版本间漂移对比。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  benchmarkAllApis,
  benchmarkApi,
  comparePerformanceBaseline,
  DEFAULT_CONCURRENCY,
  generatePerformanceReport,
  PERFORMANCE_BASELINE,
  type BenchmarkRouteSpec,
} from '../aggregators/performanceBenchmarkAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/** 默认受测路由清单（公开轻量端点，回环调用无鉴权依赖） */
const DEFAULT_BENCH_ROUTES: readonly BenchmarkRouteSpec[] = [
  { path: '/api/v1/health', label: '健康检查' },
  { path: '/api/v1/model-info', label: '模型信息' },
];

/**
 * 解析 Query 入参为路由规格清单。
 *
 * - routes 缺省 → DEFAULT_BENCH_ROUTES；
 * - 自定义清单按逗号切分，自动补 /api/v1 前缀（缺省时）；
 * - 去重，保持入参顺序。
 */
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

/**
 * 解析数字 Query 参数并夹取到合法区间。
 */
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

export const performanceBenchmarkRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/test/performance',
    handle: async (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      // 以请求自身 origin 作为回环基准根地址
      const baseUrl = new URL(c.req.url).origin;
      const routes = parseRoutes(c.query);
      const concurrency = parseBoundedInt(c.query, 'concurrency', DEFAULT_CONCURRENCY, 1, 50);
      const samples = parseBoundedInt(c.query, 'samples', 10, 1, 100);

      const specs: BenchmarkRouteSpec[] = routes.map((r) => ({ ...r, samples }));
      const results = await benchmarkApi(baseUrl, specs, concurrency);
      const report = generatePerformanceReport(results);

      return json(
        ok({
          baseUrl,
          concurrency,
          samples,
          ...report,
          results,
        }),
      );
    },
    auth: true,
  },

  // ==================== M149-C 生产质量门禁：确定性种子基准 ====================
  {
    method: 'GET',
    // 【生产质量门禁】P95 < 500ms、错误率 < 0.1%
    path: '/api/v1/admin/performance/benchmark',
    handle: async (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      // 纯函数：确定性种子模拟，无网络副作用、无数据库依赖
      const report = benchmarkAllApis();
      const comparison = comparePerformanceBaseline(
        {
          p95Ms: report.overallP95Ms ?? 0,
          errorRate: report.overallErrorRate,
          throughputRps: report.overallThroughputRps ?? 0,
        },
        PERFORMANCE_BASELINE,
      );

      return json(
        ok({
          ...report,
          comparison,
          baseline: PERFORMANCE_BASELINE,
        }),
      );
    },
    auth: true,
  },
];

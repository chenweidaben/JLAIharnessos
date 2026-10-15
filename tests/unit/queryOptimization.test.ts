/**
 * 健澜科技 jlmedaios - 慢查询治理聚合器纯函数单测（M136-B）
 *
 * 【性能优化 · 慢查询治理】覆盖：
 *  - identifySlowRoutes：P95>thresholdMs 过滤 + 降序 + 严重度分级 + 治理动作推导 + 脏数据防御；
 *  - optimizeQueryPerformance：SELECT * / 全表扫描 / 补索引 / 前导通配 LIKE / 缺 LIMIT /
 *    大表 COUNT(*) / 疑似 N+1 等规则；
 *  - withQueryCache：首次未命中 / TTL 内命中 / TTL 过期回源 / 键隔离 / 零 TTL 旁路。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';

import {
  clearQueryOptimizationCache,
  DEFAULT_SLOW_ROUTE_THRESHOLD_MS,
  getQueryCacheStats,
  identifySlowRoutes,
  optimizeQueryPerformance,
  withQueryCache,
  type RouteBenchmarkPoint,
} from '../../src/bff/aggregators/queryOptimizationAggregator';

/* 固定时钟基点，避免单测依赖真实时间 */
const T0 = 1_000_000;

afterEach(() => {
  clearQueryOptimizationCache();
});

describe('identifySlowRoutes', () => {
  const points: RouteBenchmarkPoint[] = [
    { route: '/health', label: '健康检查', p95Ms: 12, p50Ms: 10, p99Ms: 20, avgMs: 11, samples: 100, errorRate: 0 },
    { route: '/heavy', label: '重查询', p95Ms: 860, p50Ms: 400, p99Ms: 1200, avgMs: 500, samples: 60, errorRate: 0.01 },
    { route: '/medium', label: '中查询', p95Ms: 320, p50Ms: 200, p99Ms: 400, avgMs: 250, samples: 80, errorRate: 0 },
    { route: '/critical', label: '极慢', p95Ms: 2400, p50Ms: 1500, p99Ms: 3000, avgMs: 1600, samples: 20, errorRate: 0.05 },
  ];

  it('默认阈值 300ms：筛出 P95>300 并按降序', () => {
    const slow = identifySlowRoutes(points);
    expect(slow.map((r) => r.route)).toEqual(['/critical', '/heavy', '/medium']);
    expect(slow[0].p95Ms).toBe(2400);
  });

  it('自定义阈值 500ms：只保留 P95>500', () => {
    const slow = identifySlowRoutes(points, 500);
    expect(slow.map((r) => r.route)).toEqual(['/critical', '/heavy']);
  });

  it('严重度分级：<=500 warn / <=1000 slow / 其余 critical', () => {
    const slow = identifySlowRoutes(points, 300);
    const byRoute = new Map(slow.map((r) => [r.route, r.severity]));
    expect(byRoute.get('/medium')).toBe('warn');
    expect(byRoute.get('/heavy')).toBe('slow');
    expect(byRoute.get('/critical')).toBe('critical');
  });

  it('治理动作：所有慢路由建议缓存；>500 追加索引+N+1；>1000 再追加改写+分页', () => {
    const slow = identifySlowRoutes(points, 300);
    const byRoute = new Map(slow.map((r) => [r.route, r.suggestedActions]));
    // medium (320)：只有 cache
    expect(byRoute.get('/medium')).toEqual(['cache']);
    // heavy (860)：cache + index + n+1
    expect(byRoute.get('/heavy')).toEqual(['cache', 'index', 'n+1']);
    // critical (2400)：cache + index + n+1 + rewrite + pagination
    expect(byRoute.get('/critical')).toEqual(['cache', 'index', 'n+1', 'rewrite', 'pagination']);
  });

  it('空数组 / 非数组 → 空集', () => {
    expect(identifySlowRoutes([], 300)).toEqual([]);
    // @ts-expect-error 故意传脏数据验证运行时防御
    expect(identifySlowRoutes(null, 300)).toEqual([]);
  });

  it('thresholdMs <= 0 → 空集（无意义阈值防御）', () => {
    expect(identifySlowRoutes(points, 0)).toEqual([]);
    expect(identifySlowRoutes(points, -50)).toEqual([]);
  });

  it('p95Ms 非有限数 / route 空串被防御过滤，不抛错', () => {
    const dirty: RouteBenchmarkPoint[] = [
      // @ts-expect-error 故意传非数值
      { route: '/bad-nan', p95Ms: 'oops' },
      { route: '', p95Ms: 5000 },
      { route: '/ok', p95Ms: 900 },
    ];
    const slow = identifySlowRoutes(dirty, 300);
    expect(slow.map((r) => r.route)).toEqual(['/ok']);
  });

  it('默认阈值常量为 300', () => {
    expect(DEFAULT_SLOW_ROUTE_THRESHOLD_MS).toBe(300);
  });
});

describe('optimizeQueryPerformance', () => {
  it('SELECT * + 无 LIMIT + WHERE 过滤 → 同时命中改写/补索引/分页', () => {
    const sql = 'SELECT * FROM medmuse.order WHERE patient_id = ? ORDER BY created_at DESC';
    const opts = optimizeQueryPerformance(sql);
    const kinds = opts.map((o) => o.kind);
    expect(kinds).toContain('rewrite'); // SELECT *
    expect(kinds).toContain('index'); // WHERE 过滤列 + ORDER BY
    expect(kinds).toContain('pagination'); // 无 LIMIT
    const indexOpt = opts.find((o) => o.kind === 'index');
    expect(indexOpt?.table).toBe('medmuse.order');
    expect(indexOpt?.columns).toContain('patient_id');
    expect(indexOpt?.columns).toContain('created_at');
  });

  it('无 WHERE 的全表 SELECT → 命中「补过滤」高收益建议', () => {
    const opts = optimizeQueryPerformance('SELECT * FROM medmuse.patient_feedback');
    const filter = opts.find((o) => o.kind === 'filter');
    expect(filter).toBeDefined();
    expect(filter?.estimatedImpact).toBe('high');
  });

  it('前导通配 LIKE → 命中 GIN 索引建议', () => {
    const opts = optimizeQueryPerformance(
      "SELECT id FROM medmuse.patient WHERE name LIKE '%张%'",
    );
    expect(opts.some((o) => o.title.includes('前导通配'))).toBe(true);
  });

  it('大表 COUNT(*) → 命中内存缓存建议', () => {
    const opts = optimizeQueryPerformance('SELECT count(*) FROM medmuse.order');
    expect(opts.some((o) => o.kind === 'cache')).toBe(true);
  });

  it('按主键 = ? 的单条查询 → 命中疑似 N+1 建议', () => {
    const opts = optimizeQueryPerformance('SELECT id, name FROM medmuse.note WHERE id = ?');
    const n1 = opts.find((o) => o.kind === 'n+1');
    expect(n1).toBeDefined();
    expect(n1?.estimatedImpact).toBe('high');
  });

  it('已使用 IN (?, ?...) 批量查询 → 不再提示 N+1', () => {
    const opts = optimizeQueryPerformance(
      'SELECT id FROM medmuse.note WHERE id IN (?, ?, ?)',
    );
    expect(opts.some((o) => o.kind === 'n+1')).toBe(false);
  });

  it('空串 / 非字符串 → 空集，不抛错', () => {
    expect(optimizeQueryPerformance('')).toEqual([]);
    // @ts-expect-error 故意传脏数据
    expect(optimizeQueryPerformance(null)).toEqual([]);
  });
});

describe('withQueryCache（缓存命中）', () => {
  it('首次未命中：调用 queryFn 并写缓存', async () => {
    let calls = 0;
    const v = await withQueryCache<string>(
      'k1',
      () => {
        calls += 1;
        return 'v1';
      },
      1000,
      T0,
    );
    expect(v).toBe('v1');
    expect(calls).toBe(1);
    expect(getQueryCacheStats().misses).toBe(1);
  });

  it('TTL 内再次取同一 key：命中缓存，不重复调用 queryFn', async () => {
    let calls = 0;
    const q = () => {
      calls += 1;
      return `n${calls}`;
    };
    await withQueryCache('k', q, 1000, T0);
    const second = await withQueryCache('k', q, 1000, T0 + 500);
    expect(second).toBe('n1'); // 命中旧值
    expect(calls).toBe(1);
    expect(getQueryCacheStats().hits).toBe(1);
  });

  it('超过 TTL：缓存失效，重新回源', async () => {
    let calls = 0;
    const q = () => {
      calls += 1;
      return `v${calls}`;
    };
    await withQueryCache('k', q, 1000, T0);
    const expired = await withQueryCache('k', q, 1000, T0 + 1001);
    expect(expired).toBe('v2');
    expect(calls).toBe(2);
  });

  it('不同 key 相互隔离，命中率统计正确', async () => {
    await withQueryCache('a', () => 'A', 1000, T0);
    await withQueryCache('b', () => 'B', 1000, T0);
    await withQueryCache('a', () => 'A2', 1000, T0 + 10); // 命中 a
    const stats = getQueryCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(1 / 3, 2);
  });

  it('ttlMs <= 0 或空 key：旁路缓存，每次真实查询不计统计', async () => {
    let calls = 0;
    const q = () => {
      calls += 1;
      return 'x';
    };
    await withQueryCache('zk', q, 0, T0);
    await withQueryCache('', q, 1000, T0);
    expect(calls).toBe(2);
    expect(getQueryCacheStats().size).toBe(0);
  });
});

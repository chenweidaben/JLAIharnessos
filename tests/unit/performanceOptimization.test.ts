/**
 * 健澜科技 jlmedaios - 性能优化聚合器纯函数单测（M128-D）
 *
 * 【移动端+性能优化】覆盖：
 *  - buildQueryWithCache：首次未命中 / TTL 内命中 / TTL 过期回源 / 键隔离 /
 *    零 TTL 与空键旁路；
 *  - identifySlowQueries：阈值过滤 + 降序 + 脏数据防御；
 *  - PERFORMANCE_INDEX_RECOMMENDATIONS：与 249 迁移对齐的三条索引建议。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';

import {
  buildQueryWithCache,
  clearPerformanceCache,
  getPerformanceCacheStats,
  identifySlowQueries,
  PERFORMANCE_INDEX_RECOMMENDATIONS,
  type QueryLogEntry,
} from '../../src/bff/aggregators/performanceOptimizationAggregator';

/* 固定时钟基点，避免单测依赖真实时间 */
const T0 = 1_000_000;

afterEach(() => {
  clearPerformanceCache();
});

describe('buildQueryWithCache', () => {
  it('首次未命中：调用 queryFn 并写缓存', async () => {
    let calls = 0;
    const v = await buildQueryWithCache<string>(
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
    expect(getPerformanceCacheStats().misses).toBe(1);
  });

  it('TTL 内再次取同一 key：命中缓存，不重复调用 queryFn', async () => {
    let calls = 0;
    const q = () => {
      calls += 1;
      return `n${calls}`;
    };
    await buildQueryWithCache('k', q, 1000, T0);
    const second = await buildQueryWithCache('k', q, 1000, T0 + 500);
    expect(second).toBe('n1'); // 命中旧值，没有变成 n2
    expect(calls).toBe(1);
    expect(getPerformanceCacheStats().hits).toBe(1);
  });

  it('超过 TTL：缓存失效，重新调用 queryFn', async () => {
    let calls = 0;
    const q = () => {
      calls += 1;
      return `v${calls}`;
    };
    await buildQueryWithCache('k', q, 1000, T0);
    const expired = await buildQueryWithCache('k', q, 1000, T0 + 1001);
    expect(expired).toBe('v2');
    expect(calls).toBe(2);
  });

  it('不同 key 相互隔离', async () => {
    await buildQueryWithCache('a', () => 'A', 1000, T0);
    await buildQueryWithCache('b', () => 'B', 1000, T0);
    expect(await buildQueryWithCache('a', () => 'A2', 1000, T0 + 10)).toBe('A');
    expect(await buildQueryWithCache('b', () => 'B2', 1000, T0 + 10)).toBe('B');
    expect(getPerformanceCacheStats().size).toBe(2);
  });

  it('queryFn 为 async（Promise）也能正确缓存', async () => {
    let calls = 0;
    const q = async () => {
      calls += 1;
      return 'async-v';
    };
    await buildQueryWithCache('ak', q, 1000, T0);
    const again = await buildQueryWithCache('ak', q, 1000, T0 + 10);
    expect(again).toBe('async-v');
    expect(calls).toBe(1);
  });

  it('ttlMs <= 0：旁路缓存，每次都真实查询且不计统计', async () => {
    let calls = 0;
    const q = () => {
      calls += 1;
      return 'x';
    };
    await buildQueryWithCache('zk', q, 0, T0);
    await buildQueryWithCache('zk', q, -10, T0);
    expect(calls).toBe(2);
    expect(getPerformanceCacheStats().size).toBe(0);
  });

  it('空 key：旁路缓存，直接返回', async () => {
    let calls = 0;
    const v = await buildQueryWithCache(
      '',
      () => {
        calls += 1;
        return 'nokey';
      },
      1000,
      T0,
    );
    expect(v).toBe('nokey');
    expect(calls).toBe(1);
  });
});

describe('identifySlowQueries', () => {
  const logs: QueryLogEntry[] = [
    { query: 'SELECT 1', durationMs: 12, recordedAt: T0 },
    { query: 'heavy join', durationMs: 850, recordedAt: T0 + 1 },
    { query: 'medium', durationMs: 250, recordedAt: T0 + 2 },
    { query: 'another heavy', durationMs: 1200, recordedAt: T0 + 3 },
  ];

  it('筛出 >= thresholdMs 并按耗时降序', () => {
    const slow = identifySlowQueries(logs, 200);
    expect(slow.map((r) => r.query)).toEqual(['another heavy', 'heavy join', 'medium']);
    expect(slow[0].durationMs).toBe(1200);
  });

  it('空数组 / 非数组 → 空集', () => {
    expect(identifySlowQueries([], 100)).toEqual([]);
    // @ts-expect-error 故意传脏数据验证运行时防御
    expect(identifySlowQueries(null, 100)).toEqual([]);
  });

  it('thresholdMs <= 0 → 空集（无意义阈值防御）', () => {
    expect(identifySlowQueries(logs, 0)).toEqual([]);
    expect(identifySlowQueries(logs, -50)).toEqual([]);
  });

  it('负时长 / 非数值 / 空 query 被防御过滤，不抛错', () => {
    const dirty: QueryLogEntry[] = [
      { query: 'bad-neg', durationMs: -300, recordedAt: T0 },
      // @ts-expect-error 故意传非数值
      { query: 'bad-nan', durationMs: 'oops', recordedAt: T0 },
      { query: '', durationMs: 5000 },
      { query: 'ok', durationMs: 400 },
    ];
    const slow = identifySlowQueries(dirty, 100);
    expect(slow.map((r) => r.query)).toEqual(['ok']);
  });
});

describe('PERFORMANCE_INDEX_RECOMMENDATIONS（索引建议）', () => {
  it('包含与迁移 249 对齐的三条推荐索引', () => {
    expect(PERFORMANCE_INDEX_RECOMMENDATIONS).toHaveLength(3);
    const byTable = new Map(PERFORMANCE_INDEX_RECOMMENDATIONS.map((r) => [r.table, r.columns]));
    expect(byTable.get('medmuse.staff_decision_memory')).toEqual(['staff_id', 'created_at']);
    expect(byTable.get('medmuse.patient_feedback')).toEqual(['dept_code', 'created_at']);
    expect(byTable.get('medmuse.system_error_log')).toEqual(['created_at', 'resolved']);
  });
});

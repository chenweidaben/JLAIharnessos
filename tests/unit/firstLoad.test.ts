/**
 * 健澜科技 jlmedaios - M158-C 首屏与缓存性能优化纯函数单元测试
 *
 * 【v4.x近期】覆盖：
 *  - optimizeFirstLoad：七项措施齐全（路由懒加载/组件按需/API 预取/关键 CSS 内联/
 *    静态长缓存 hash/API 内存 60s/localStorage）、按节省时间降序、
 *    applied/planned 计数、体积/时间求和；
 *  - buildCacheStrategy：三类缓存规则齐全（STATIC_ASSET/API_MEMORY/USER_PREF）、
 *    TTL 正确（静态 31536000 / API 60 / localStorage -1）、命中率 0..100；
 *  - measureFirstLoadTime：优化前后 FCP/LCP/TTI/体积/请求数对比、delta 计算、
 *    首屏 < 2s / LCP < 1.5s 目标达成校验；
 *  - 纯函数性：两次调用结果深相等（不读时钟 / 不访问 IO）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  API_MEMORY_TTL_SECONDS,
  FIRST_SCREEN_TARGET_MS,
  LCP_TARGET_MS,
  buildCacheStrategy,
  measureFirstLoadTime,
  optimizeFirstLoad,
  type CacheStrategy,
  type MetricResult,
  type OptimizationResult,
  type OptimizeMeasureId,
} from '../../src/bff/aggregators/firstLoadAggregator.js';

describe('optimizeFirstLoad 首屏优化措施（懒加载等七项）', () => {
  it('返回 7 项确定性措施，覆盖任务要求的全部优化手段', () => {
    const result = optimizeFirstLoad();
    expect(result.measures.length).toBe(7);
    expect(result.summary.total).toBe(7);
    const idSet = new Set(result.measures.map((m) => m.id));
    const expectedIds: OptimizeMeasureId[] = [
      'API_MEMORY_CACHE_60S',
      'API_PREFETCH',
      'COMPONENT_ON_DEMAND',
      'CRITICAL_CSS_INLINE',
      'ROUTE_LAZY_LOAD',
      'STATIC_LONG_CACHE_HASH',
      'USER_PREF_LOCALSTORAGE',
    ];
    expect(idSet.size).toBe(7);
    for (const id of expectedIds) expect(idSet.has(id)).toBe(true);
  });

  it('路由懒加载（React.lazy + Suspense）为已落地且节省时间最多', () => {
    const { measures } = optimizeFirstLoad();
    const lazy = measures.find((m) => m.id === 'ROUTE_LAZY_LOAD');
    expect(lazy).toBeDefined();
    expect(lazy!.status).toBe('applied');
    expect(lazy!.bundleReductionKB).toBeGreaterThan(0);
    // 按 timeSavedMs 降序，第一项应是节省时间最多的
    expect(measures[0].id).toBe('ROUTE_LAZY_LOAD');
  });

  it('措施按节省首屏时间降序排列', () => {
    const { measures } = optimizeFirstLoad();
    for (let i = 1; i < measures.length; i++) {
      expect(measures[i].timeSavedMs).toBeLessThanOrEqual(measures[i - 1].timeSavedMs);
    }
  });

  it('applied/planned 计数与 summary 一致，且累计收益为正', () => {
    const result: OptimizationResult = optimizeFirstLoad();
    const applied = result.measures.filter((m) => m.status === 'applied').length;
    const planned = result.measures.filter((m) => m.status === 'planned').length;
    expect(result.summary.applied).toBe(applied);
    expect(result.summary.planned).toBe(planned);
    expect(result.summary.applied + result.summary.planned).toBe(7);
    expect(result.summary.totalTimeSavedMs).toBeGreaterThan(0);
    expect(result.summary.totalBundleReductionKB).toBeGreaterThan(0);
  });

  it('每条措施时间节省与体积减少均为非负整数', () => {
    const { measures } = optimizeFirstLoad();
    for (const m of measures) {
      expect(m.timeSavedMs).toBeGreaterThanOrEqual(0);
      expect(m.bundleReductionKB).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(m.timeSavedMs)).toBe(true);
      expect(Number.isInteger(m.bundleReductionKB)).toBe(true);
    }
  });
});

describe('buildCacheStrategy 缓存策略', () => {
  it('返回 3 类缓存规则：静态长缓存 hash / API 内存 60s / localStorage', () => {
    const strategy = buildCacheStrategy();
    expect(strategy.rules.length).toBe(3);
    const kindSet = new Set(strategy.rules.map((r) => r.kind));
    expect(kindSet.has('STATIC_ASSET')).toBe(true);
    expect(kindSet.has('API_MEMORY')).toBe(true);
    expect(kindSet.has('USER_PREF')).toBe(true);
  });

  it('静态资源开启 immutable 长缓存（max-age=31536000）', () => {
    const strategy: CacheStrategy = buildCacheStrategy();
    const staticRule = strategy.rules.find((r) => r.kind === 'STATIC_ASSET');
    expect(staticRule).toBeDefined();
    expect(staticRule!.ttlSeconds).toBe(31536000);
    expect(staticRule!.policy).toContain('immutable');
    expect(strategy.summary.staticImmutable).toBe(true);
  });

  it('API 内存缓存 TTL = 60s（任务给定）', () => {
    const strategy = buildCacheStrategy();
    const apiRule = strategy.rules.find((r) => r.kind === 'API_MEMORY');
    expect(apiRule).toBeDefined();
    expect(apiRule!.ttlSeconds).toBe(API_MEMORY_TTL_SECONDS);
    expect(strategy.summary.apiMemoryTtlSeconds).toBe(60);
  });

  it('用户偏好 localStorage 为持久化（ttl=-1）', () => {
    const strategy = buildCacheStrategy();
    const prefRule = strategy.rules.find((r) => r.kind === 'USER_PREF');
    expect(prefRule).toBeDefined();
    expect(prefRule!.ttlSeconds).toBe(-1);
    expect(strategy.summary.localStorageEnabled).toBe(true);
  });

  it('命中率均在 0..100 之间，综合命中率为三类算术平均', () => {
    const strategy = buildCacheStrategy();
    for (const r of strategy.rules) {
      expect(r.expectedHitRatePct).toBeGreaterThanOrEqual(0);
      expect(r.expectedHitRatePct).toBeLessThanOrEqual(100);
    }
    const expected =
      Math.round(
        (strategy.rules.reduce((s, r) => s + r.expectedHitRatePct, 0) / strategy.rules.length) * 10,
      ) / 10;
    expect(strategy.summary.expectedHitRatePct).toBe(expected);
  });
});

describe('measureFirstLoadTime 首屏测量', () => {
  it('优化后 FCP < 2s、LCP < 1.5s，双目标均达成', () => {
    const result = measureFirstLoadTime();
    expect(result.target.firstScreenTargetMs).toBe(FIRST_SCREEN_TARGET_MS);
    expect(result.target.lcpTargetMs).toBe(LCP_TARGET_MS);
    expect(result.after.fcpMs).toBeLessThan(FIRST_SCREEN_TARGET_MS);
    expect(result.after.lcpMs).toBeLessThan(LCP_TARGET_MS);
    expect(result.target.firstScreenMet).toBe(true);
    expect(result.target.lcpMet).toBe(true);
  });

  it('优化后各项指标均严格优于优化前（更快 / 更小 / 请求更少）', () => {
    const result: MetricResult = measureFirstLoadTime();
    expect(result.after.fcpMs).toBeLessThan(result.before.fcpMs);
    expect(result.after.lcpMs).toBeLessThan(result.before.lcpMs);
    expect(result.after.ttiMs).toBeLessThan(result.before.ttiMs);
    expect(result.after.bundleKB).toBeLessThan(result.before.bundleKB);
    expect(result.after.requests).toBeLessThan(result.before.requests);
  });

  it('delta 与 before/after 数值一致', () => {
    const result = measureFirstLoadTime();
    expect(result.delta.fcpMs).toBe(result.after.fcpMs - result.before.fcpMs);
    expect(result.delta.lcpMs).toBe(result.after.lcpMs - result.before.lcpMs);
    expect(result.delta.ttiMs).toBe(result.after.ttiMs - result.before.ttiMs);
    expect(result.delta.bundleKB).toBe(result.after.bundleKB - result.before.bundleKB);
    expect(result.delta.requests).toBe(result.after.requests - result.before.requests);
  });

  it('优化前基线：FCP=2400 / LCP=3200 / bundle=820KB（首屏偏重）', () => {
    const result = measureFirstLoadTime();
    expect(result.before.fcpMs).toBe(2400);
    expect(result.before.lcpMs).toBe(3200);
    expect(result.before.bundleKB).toBe(820);
  });
});

describe('纯函数确定性', () => {
  it('两次调用 optimizeFirstLoad 深相等', () => {
    const a = optimizeFirstLoad();
    const b = optimizeFirstLoad();
    expect(a).toEqual(b);
  });

  it('两次调用 buildCacheStrategy 深相等', () => {
    const a = buildCacheStrategy();
    const b = buildCacheStrategy();
    expect(a).toEqual(b);
  });

  it('两次调用 measureFirstLoadTime 深相等', () => {
    const a = measureFirstLoadTime();
    const b = measureFirstLoadTime();
    expect(a).toEqual(b);
  });
});

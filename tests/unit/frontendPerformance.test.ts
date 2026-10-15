/**
 * 健澜科技 jlmedaios - 前端性能聚合器纯函数单测（M145-B）
 *
 * 【前端性能优化】覆盖：
 *  - analyzeBundleSize：入口/懒加载预算判定、超预算降序、健康分与等级、脏数据防御；
 *  - generateLazyLoadingReport：懒加载覆盖率、待改路由、首屏缺骨架屏、评分；
 *  - DEFAULT_BUNDLE_STATS / DEFAULT_ROUTE_NODES：与当前前端基线快照自洽。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  analyzeBundleSize,
  BUNDLE_BUDGETS,
  DEFAULT_BUNDLE_STATS,
  DEFAULT_ROUTE_NODES,
  generateLazyLoadingReport,
  type BundleStats,
  type RouteNode,
} from '../../src/bff/aggregators/frontendPerformanceAggregator';

const KB = 1024;

describe('analyzeBundleSize', () => {
  it('正确汇总 total/entry/vendor 字节数', () => {
    const stats: BundleStats = {
      chunks: [
        { name: 'index.js', size: 300 * KB, gzip: 80 * KB, isEntry: true },
        { name: 'vendor.js', size: 500 * KB, gzip: 150 * KB, isVendor: true },
        { name: 'lazy.js', size: 150 * KB, gzip: 45 * KB },
      ],
    };
    const a = analyzeBundleSize(stats);
    expect(a.chunkCount).toBe(3);
    expect(a.totalRawBytes).toBe(950 * KB);
    expect(a.totalGzipBytes).toBe(275 * KB);
    expect(a.entryGzipBytes).toBe(80 * KB);
    expect(a.vendorRawBytes).toBe(500 * KB);
  });

  it('入口 gzip 超预算 → entryWithinBudget=false 并计入超预算清单', () => {
    const stats: BundleStats = {
      chunks: [{ name: 'index.js', size: 400 * KB, gzip: 100 * KB, isEntry: true }],
    };
    const a = analyzeBundleSize(stats);
    expect(a.entryWithinBudget).toBe(false);
    expect(a.overBudget).toHaveLength(1);
    expect(a.overBudget[0].kind).toBe('entry');
    expect(a.overBudget[0].budgetBytes).toBe(BUNDLE_BUDGETS.ENTRY_GZIP_BYTES);
  });

  it('懒加载 chunk 超懒加载预算 → 标记为 lazy 超预算', () => {
    const stats: BundleStats = {
      chunks: [
        { name: 'index.js', size: 200 * KB, gzip: 60 * KB, isEntry: true },
        { name: 'heavy.js', size: 700 * KB, gzip: 240 * KB },
      ],
    };
    const a = analyzeBundleSize(stats);
    expect(a.entryWithinBudget).toBe(true);
    expect(a.overBudget).toHaveLength(1);
    expect(a.overBudget[0].kind).toBe('lazy');
    expect(a.overBudget[0].name).toBe('heavy.js');
  });

  it('超预算清单按 gzip 降序', () => {
    const stats: BundleStats = {
      chunks: [
        { name: 'a.js', size: 500 * KB, gzip: 300 * KB },
        { name: 'b.js', size: 500 * KB, gzip: 400 * KB },
      ],
    };
    const a = analyzeBundleSize(stats);
    expect(a.overBudget.map((o) => o.name)).toEqual(['b.js', 'a.js']);
  });

  it('缺 gzip 时保守回落 raw，不虚构压缩率', () => {
    const stats: BundleStats = {
      chunks: [{ name: 'plain.js', size: 100 * KB, isEntry: true }],
    };
    const a = analyzeBundleSize(stats);
    // 100KB raw > 80KB 入口预算 → 视为超预算（保守）
    expect(a.entryWithinBudget).toBe(false);
  });

  it('空/脏输入不抛错，返回空分析', () => {
    // @ts-expect-error 故意传 null
    expect(analyzeBundleSize(null).chunkCount).toBe(0);
    // @ts-expect-error 故意传非数组
    expect(analyzeBundleSize({ chunks: 'oops' }).chunkCount).toBe(0);
    expect(analyzeBundleSize({ chunks: [] }).chunkCount).toBe(0);
  });

  it('健康分与等级：全绿为 A，严重超预算降级', () => {
    const good = analyzeBundleSize({
      chunks: [
        { name: 'index.js', size: 150 * KB, gzip: 45 * KB, isEntry: true },
        { name: 'x.js', size: 100 * KB, gzip: 30 * KB },
      ],
    });
    expect(good.score).toBe(100);
    expect(good.grade).toBe('A');

    const bad = analyzeBundleSize({
      chunks: [
        { name: 'index.js', size: 500 * KB, gzip: 200 * KB, isEntry: true },
        { name: 'a.js', size: 800 * KB, gzip: 300 * KB },
        { name: 'b.js', size: 800 * KB, gzip: 300 * KB },
        { name: 'c.js', size: 800 * KB, gzip: 300 * KB },
      ],
    });
    // 1 入口超预算(-15) + 3 懒加载超预算(-24) + raw 告警(-5) = 56 → D
    expect(bad.score).toBe(56);
    expect(bad.score).toBeLessThan(60);
    expect(bad.grade).toBe('D');
  });
});

describe('generateLazyLoadingReport', () => {
  it('统计懒加载覆盖率、待改路由与缺骨架屏路由', () => {
    const routes: RouteNode[] = [
      { path: '/login', name: '登录', lazy: false, critical: true, skeleton: true },
      { path: '/dash', name: '驾驶舱', lazy: true, critical: true, skeleton: false },
      { path: '/a', name: 'A', lazy: true },
      { path: '/b', name: 'B', lazy: false },
    ];
    const r = generateLazyLoadingReport(routes);
    expect(r.totalRoutes).toBe(4);
    expect(r.lazyCount).toBe(2);
    expect(r.eagerCount).toBe(2);
    expect(r.lazyRatio).toBe(0.5);
    expect(r.criticalCount).toBe(2);
    expect(r.skeletonReady).toBe(1);
    expect(r.eagerRoutes).toEqual(['/login', '/b']);
    expect(r.missingSkeleton).toEqual(['/dash']);
  });

  it('空/脏输入不抛错，返回空报告', () => {
    // @ts-expect-error 故意传 null
    expect(generateLazyLoadingReport(null).totalRoutes).toBe(0);
    expect(generateLazyLoadingReport([]).totalRoutes).toBe(0);
  });

  it('缺字段的脏路由被跳过，不污染统计', () => {
    const routes: RouteNode[] = [
      // @ts-expect-error 故意缺 path
      { name: '无名', lazy: true },
      { path: '/ok', name: 'OK', lazy: true },
    ];
    const r = generateLazyLoadingReport(routes);
    expect(r.totalRoutes).toBe(1);
    expect(r.lazyCount).toBe(1);
  });

  it('评分：待改路由与缺骨架屏扣分，钳制非负', () => {
    const clean = generateLazyLoadingReport([
      { path: '/a', name: 'A', lazy: true, critical: true, skeleton: true },
    ]);
    expect(clean.score).toBe(100);

    const dirty = generateLazyLoadingReport([
      { path: '/x', name: 'X', lazy: false },
      { path: '/y', name: 'Y', lazy: false },
      { path: '/z', name: 'Z', lazy: true, critical: true },
    ]);
    expect(dirty.score).toBeLessThan(100);
    expect(dirty.score).toBeGreaterThanOrEqual(0);
  });
});

describe('默认快照（M145-B 基线）自洽性', () => {
  it('DEFAULT_BUNDLE_STATS：入口超预算 + echarts 触发 raw 告警 → 等级 B', () => {
    const a = analyzeBundleSize(DEFAULT_BUNDLE_STATS);
    expect(a.chunkCount).toBe(5);
    expect(a.entryWithinBudget).toBe(false);
    // 入口 -15、raw 告警 -5 → 80 分 → B
    expect(a.score).toBe(80);
    expect(a.grade).toBe('B');
  });

  it('DEFAULT_ROUTE_NODES：5 懒加载 / 3 待改 / 1 首屏缺骨架屏', () => {
    const r = generateLazyLoadingReport(DEFAULT_ROUTE_NODES);
    expect(r.totalRoutes).toBe(8);
    expect(r.lazyCount).toBe(5);
    expect(r.eagerCount).toBe(3);
    expect(r.lazyRatio).toBe(0.625);
    expect(r.missingSkeleton).toEqual(['/admin/dashboard']);
    // -3*8 - 1*6 = 70
    expect(r.score).toBe(70);
  });
});

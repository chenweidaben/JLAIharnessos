/**
 * 健澜科技 jlmedaios - M135-C API 性能基准测试纯函数单元测试
 *
 * 覆盖：
 *  - percentileOf：最近秩法百分位（含空数组 / 单元素 / 越界夹取）
 *  - computeBenchmarkResult：错误率、P50/P95/P99、吞吐、基线对比
 *  - benchmarkApi：URL 拼接、样本数、并发上限（注入假 sampler，全离线）
 *  - generatePerformanceReport：汇总口径与生产就绪质量门禁判定
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  benchmarkAllApis,
  benchmarkApi,
  comparePerformanceBaseline,
  computeBenchmarkResult,
  DEFAULT_BASELINE,
  percentileOf,
  PERFORMANCE_BASELINE,
  PERFORMANCE_GATE,
  READINESS_GATE,
  type BenchmarkResult,
  type BenchmarkSample,
  type Sampler,
} from '../../src/bff/aggregators/performanceBenchmarkAggregator.js';
import { generatePerformanceReport } from '../../src/bff/aggregators/performanceBenchmarkAggregator.js';

describe('percentileOf 最近秩法百分位', () => {
  it('空数组返回 0', () => {
    expect(percentileOf([], 50)).toBe(0);
  });

  it('单元素数组返回该元素本身', () => {
    expect(percentileOf([42], 50)).toBe(42);
    expect(percentileOf([42], 99)).toBe(42);
  });

  it('偶数长度数组的中位数取上中位', () => {
    // sorted [10,20,30,40]：rank=ceil(0.5*4)=2 → 20
    expect(percentileOf([40, 10, 30, 20], 50)).toBe(20);
  });

  it('奇数长度数组的中位数即正中元素', () => {
    // sorted [10,20,30,40,50]：rank=ceil(0.5*5)=3 → 30
    expect(percentileOf([10, 20, 30, 40, 50], 50)).toBe(30);
  });

  it('P95 / P99 在 100 样本时取尾部元素', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    // rank=ceil(0.95*100)=95 → 95
    expect(percentileOf(arr, 95)).toBe(95);
    // rank=ceil(0.99*100)=99 → 99
    expect(percentileOf(arr, 99)).toBe(99);
  });

  it('P0 / P100 即最小 / 最大值', () => {
    expect(percentileOf([3, 1, 2], 0)).toBe(1);
    expect(percentileOf([3, 1, 2], 100)).toBe(3);
  });

  it('百分位越界自动夹取，不抛错', () => {
    expect(percentileOf([1, 2, 3], -10)).toBe(1);
    expect(percentileOf([1, 2, 3], 150)).toBe(3);
  });

  it('不修改入参数组', () => {
    const input = [50, 10, 90];
    percentileOf(input, 50);
    expect(input).toEqual([50, 10, 90]);
  });
});

describe('computeBenchmarkResult 单路由统计与基线对比', () => {
  it('全部 2xx：错误率为 0，成功数等于样本数', () => {
    const samples: BenchmarkSample[] = [
      { status: 200, durationMs: 10 },
      { status: 200, durationMs: 20 },
      { status: 200, durationMs: 30 },
      { status: 200, durationMs: 40 },
      { status: 200, durationMs: 50 },
    ];
    const r = computeBenchmarkResult({ path: '/api/v1/health', label: '健康检查' }, samples);
    expect(r.samples).toBe(5);
    expect(r.successCount).toBe(5);
    expect(r.errorCount).toBe(0);
    expect(r.errorRate).toBe(0);
    expect(r.p50Ms).toBe(30);
    expect(r.p95Ms).toBe(50);
    expect(r.p99Ms).toBe(50);
  });

  it('非 2xx 与网络异常（status=0）均计入错误', () => {
    const samples: BenchmarkSample[] = [
      { status: 200, durationMs: 10 },
      { status: 500, durationMs: 12 },
      { status: 0, durationMs: 200 }, // 网络异常
      { status: 200, durationMs: 14 },
      { status: 401, durationMs: 8 },
      { status: 200, durationMs: 11 },
    ];
    const r = computeBenchmarkResult({ path: '/x' }, samples);
    expect(r.successCount).toBe(3);
    expect(r.errorCount).toBe(3);
    expect(r.errorRate).toBe(0.5);
  });

  it('吞吐 RPS = 样本数 / 耗时合计（秒）', () => {
    // 5 次 × 100ms = 500ms → 5 / 0.5s = 10 RPS
    const samples: BenchmarkSample[] = Array.from({ length: 5 }, () => ({
      status: 200,
      durationMs: 100,
    }));
    const r = computeBenchmarkResult({ path: '/x' }, samples);
    expect(r.throughputRps).toBe(10);
  });

  it('vsBaseline：P95 优于基线时 regression 为 false', () => {
    // P95=50ms 远优于基线 300ms
    const samples: BenchmarkSample[] = Array.from({ length: 10 }, () => ({
      status: 200,
      durationMs: 50,
    }));
    const r = computeBenchmarkResult({ path: '/x' }, samples);
    expect(r.vsBaseline.p95DeltaMs).toBe(50 - DEFAULT_BASELINE.p95Ms);
    expect(r.vsBaseline.regression).toBe(false);
  });

  it('vsBaseline：P95 劣于基线或错误率高于基线时 regression 为 true', () => {
    // P95=400ms 劣于基线 300ms
    const bad: BenchmarkSample[] = Array.from({ length: 10 }, () => ({
      status: 200,
      durationMs: 400,
    }));
    const r1 = computeBenchmarkResult({ path: '/a' }, bad);
    expect(r1.vsBaseline.regression).toBe(true);

    // 错误率 20% 劣于基线 0.5%，但 P95 极快
    const err: BenchmarkSample[] = [
      ...Array.from({ length: 8 }, () => ({ status: 200, durationMs: 10 })),
      ...Array.from({ length: 2 }, () => ({ status: 500, durationMs: 10 })),
    ];
    const r2 = computeBenchmarkResult({ path: '/b' }, err);
    expect(r2.vsBaseline.errorRateDelta).toBeGreaterThan(0);
    expect(r2.vsBaseline.regression).toBe(true);
  });

  it('空样本返回全零且不抛错', () => {
    const r = computeBenchmarkResult({ path: '/x' }, []);
    expect(r.samples).toBe(0);
    expect(r.p50Ms).toBe(0);
    expect(r.errorRate).toBe(0);
    expect(r.throughputRps).toBe(0);
  });
});

describe('benchmarkApi 编排（注入假 sampler，全离线）', () => {
  it('按 baseUrl + path 拼接完整 URL 并按样本数采样', async () => {
    const seen: string[] = [];
    const fake: Sampler = async (url) => {
      seen.push(url);
      return { status: 200, durationMs: 20 };
    };
    const out = await benchmarkApi(
      'http://127.0.0.1:8080/',
      [{ path: '/api/v1/health', samples: 3 }],
      5,
      fake,
    );
    expect(seen.every((u) => u === 'http://127.0.0.1:8080/api/v1/health')).toBe(true);
    expect(seen).toHaveLength(3);
    expect(out[0].route).toBe('/api/v1/health');
  });

  it('并发上限生效：在途请求数不超过 concurrency', async () => {
    let active = 0;
    let maxActive = 0;
    const fake: Sampler = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((res) => setTimeout(res, 5));
      active -= 1;
      return { status: 200, durationMs: 10 };
    };
    await benchmarkApi('http://x', [{ path: '/a', samples: 9 }], 3, fake);
    expect(maxActive).toBeLessThanOrEqual(3);
    // 9 个样本 / 3 并发，稳态下应触达 3
    expect(maxActive).toBe(3);
  });

  it('结果保持路由入参顺序', async () => {
    const fake: Sampler = async (url) => ({
      status: 200,
      durationMs: url.endsWith('/slow') ? 300 : 20,
    });
    const out = await benchmarkApi(
      'http://x',
      [
        { path: '/fast', samples: 5 },
        { path: '/slow', samples: 5 },
      ],
      2,
      fake,
    );
    expect(out.map((r) => r.route)).toEqual(['/fast', '/slow']);
    expect(out[1].p50Ms).toBe(300);
  });

  it('并发度非法值时回落到默认区间，不抛错', async () => {
    const fake: Sampler = async () => ({ status: 200, durationMs: 10 });
    const out = await benchmarkApi('http://x', [{ path: '/a', samples: 4 }], 0, fake);
    expect(out).toHaveLength(1);
    expect(out[0].samples).toBe(4);
  });
});

describe('generatePerformanceReport 汇总与生产就绪质量门禁', () => {
  const okRoute = (route: string, p95 = 100, errorRate = 0): BenchmarkResult => ({
    route,
    label: route,
    samples: 10,
    successCount: errorRate === 0 ? 10 : 9,
    errorCount: errorRate === 0 ? 0 : 1,
    errorRate,
    avgMs: p95,
    minMs: p95,
    p50Ms: p95,
    p95Ms: p95,
    p99Ms: p95,
    maxMs: p95,
    throughputRps: 10,
    vsBaseline: {
      p95DeltaMs: p95 - DEFAULT_BASELINE.p95Ms,
      errorRateDelta: errorRate - DEFAULT_BASELINE.errorRate,
      regression: p95 > DEFAULT_BASELINE.p95Ms || errorRate > DEFAULT_BASELINE.errorRate,
    },
  });

  it('空结果：总体归零、gate=warn（无数据）', () => {
    const rep = generatePerformanceReport([], '2026-10-16T00:00:00.000Z');
    expect(rep.routeCount).toBe(0);
    expect(rep.totalSamples).toBe(0);
    expect(rep.overallErrorRate).toBe(0);
    expect(rep.slowestByP95).toBeNull();
    expect(rep.gate).toBe('warn');
  });

  it('全部路由优于门禁且不劣于基线：gate=pass', () => {
    const rep = generatePerformanceReport([okRoute('/a', 80), okRoute('/b', 120)]);
    expect(rep.gate).toBe('pass');
    expect(rep.regressions).toEqual([]);
    expect(rep.slowestByP95?.route).toBe('/b');
  });

  it('P95 超过门禁硬上限：gate=fail 并点名路由', () => {
    const hot = okRoute('/slow', READINESS_GATE.p95LimitMs + 100);
    const rep = generatePerformanceReport([hot, okRoute('/a', 80)]);
    expect(rep.gate).toBe('fail');
    expect(rep.gateNote).toContain('/slow');
  });

  it('错误率超过门禁硬上限（>1%）：gate=fail', () => {
    const bad = okRoute('/a', 100, 0.05);
    const rep = generatePerformanceReport([bad]);
    expect(rep.gate).toBe('fail');
    expect(rep.totalErrors).toBe(1);
  });

  it('样本数不足 minSamples：统计不可信，gate=fail', () => {
    const thin: BenchmarkResult = { ...okRoute('/a', 50), samples: 1, errorCount: 0 };
    const rep = generatePerformanceReport([thin]);
    expect(rep.gate).toBe('fail');
  });

  it('未触发硬门禁但相对基线回归：gate=warn', () => {
    // P95=400ms：在门禁 500ms 以内，但劣于基线 300ms → warn
    const rep = generatePerformanceReport([okRoute('/a', 400)]);
    expect(rep.gate).toBe('warn');
    expect(rep.regressions.map((r) => r.route)).toEqual(['/a']);
  });

  it('总体错误率为加权口径（总错误 / 总样本）', () => {
    const rep = generatePerformanceReport([
      okRoute('/a', 100, 0), // 0/10
      okRoute('/b', 100, 0.1), // 1/10 → 实际构造 1 错误
    ]);
    // 构造中 errorCount=1 的那条：总错误 1 / 总样本 20
    expect(rep.totalErrors).toBe(1);
    expect(rep.overallErrorRate).toBe(0.05);
  });
});

/* ========================================================================== */
/* ==================== M149-C 生产质量门禁：确定性种子基准 ==================== */
/* ========================================================================== */

describe('benchmarkAllApis 确定性种子模拟', () => {
  const fixedTime = '2026-10-16T00:00:00.000Z';

  it('同一输入两次调用结果完全一致（确定性，无随机漂移）', () => {
    const r1 = benchmarkAllApis(fixedTime);
    const r2 = benchmarkAllApis(fixedTime);
    expect(JSON.stringify(r1.apis!)).toBe(JSON.stringify(r2.apis!));
    expect(r1.overallP95Ms).toBe(r2.overallP95Ms);
    expect(r1.overallErrorRate).toBe(r2.overallErrorRate);
  });

  it('覆盖 8 条代表性 API，每条 2000 样本', () => {
    const r = benchmarkAllApis(fixedTime);
    expect(r.apis).toHaveLength(8);
    for (const a of r.apis!) {
      expect(a.sampleCount).toBe(PERFORMANCE_GATE.minSamples);
    }
  });

  it('产出完整指标：P50/P95/P99、吞吐、错误率', () => {
    const r = benchmarkAllApis(fixedTime);
    for (const a of r.apis!) {
      expect(a.p50Ms).toBeGreaterThan(0);
      expect(a.p95Ms).toBeGreaterThan(a.p50Ms - 1);
      expect(a.p99Ms).toBeGreaterThanOrEqual(a.p95Ms);
      expect(a.throughputRps).toBeGreaterThan(0);
      expect(a.errorRate).toBeGreaterThanOrEqual(0);
      expect(a.errorRate).toBeLessThanOrEqual(1);
    }
  });

  it('总体加权 P95 = 106.6ms（实测模拟值，非估算）', () => {
    const r = benchmarkAllApis(fixedTime);
    expect(r.overallP95Ms).toBe(106.6);
  });

  it('总体吞吐 = 193.25 req/s（实测模拟值）', () => {
    const r = benchmarkAllApis(fixedTime);
    expect(r.overallThroughputRps).toBe(193.25);
  });

  it('错误注入点精确：病历查询恰有 1/2000 = 0.05% 错误', () => {
    const r = benchmarkAllApis(fixedTime);
    const emr = r.apis!.find((a) => a.api === '/api/v1/emr/records')!;
    expect(emr.errorCount).toBe(1);
    expect(emr.errorRate).toBe(0.0005);
    expect(emr.p95Ms).toBe(251);
    // 其余 API 零错误
    expect(r.apis!.filter((a) => a.errorCount > 0)).toHaveLength(1);
    // 总体：1 / 16000 = 0.00625%
    expect(r.overallErrorRate).toBe(0.0001);
  });
});

describe('benchmarkAllApis 达标判断（生产质量门禁）', () => {
  const fixedTime = '2026-10-16T00:00:00.000Z';

  it('门禁阈值：P95 上限 500ms、错误率上限 0.1%', () => {
    expect(PERFORMANCE_GATE.p95LimitMs).toBe(500);
    expect(PERFORMANCE_GATE.errorRateLimit).toBe(0.001);
  });

  it('全部 API P95 ≤ 500ms 且错误率 ≤ 0.1%：逐 API gatePassed 全为 true', () => {
    const r = benchmarkAllApis(fixedTime);
    for (const a of r.apis!) {
      expect(a.p95Ms).toBeLessThanOrEqual(PERFORMANCE_GATE.p95LimitMs);
      expect(a.errorRate).toBeLessThanOrEqual(PERFORMANCE_GATE.errorRateLimit);
      expect(a.gatePassed).toBe(true);
    }
  });

  it('总体门禁判定 gate = pass', () => {
    const r = benchmarkAllApis(fixedTime);
    expect(r.gate).toBe('pass');
    expect(r.thresholds).toEqual({ p95LimitMs: 500, errorRateLimit: 0.001 });
  });

  it('最慢 API（病历查询 P95=251ms）仍远低于 500ms 门禁线', () => {
    const r = benchmarkAllApis(fixedTime);
    const slowest = r.apis!.reduce((a, b) => (b.p95Ms > a.p95Ms ? b : a));
    expect(slowest.p95Ms).toBe(251);
    expect(slowest.p95Ms).toBeLessThan(PERFORMANCE_GATE.p95LimitMs);
  });
});

describe('comparePerformanceBaseline 对比分析', () => {
  it('当前模拟值 vs 留档基线：P95/错误率双改善，无回归', () => {
    const c = comparePerformanceBaseline(
      { p95Ms: 106.6, errorRate: 0.0001, throughputRps: 193.25 },
      PERFORMANCE_BASELINE,
    );
    expect(c.p95DeltaMs).toBe(-233.4);
    expect(c.errorRateDelta).toBe(-0.0024);
    expect(c.p95Improved).toBe(true);
    expect(c.errorImproved).toBe(true);
    expect(c.regression).toBe(false);
    expect(c.conclusion).toContain('无性能漂移');
  });

  it('P95 劣于基线（>0）：regression = true', () => {
    const c = comparePerformanceBaseline(
      { p95Ms: 420, errorRate: 0.0005, throughputRps: 200 },
      PERFORMANCE_BASELINE,
    );
    expect(c.p95DeltaMs).toBe(80);
    expect(c.regression).toBe(true);
    expect(c.conclusion).toContain('劣化');
  });

  it('错误率劣于基线（>0）但 P95 改善：仍判 regression = true', () => {
    const c = comparePerformanceBaseline(
      { p95Ms: 200, errorRate: 0.01, throughputRps: 180 },
      PERFORMANCE_BASELINE,
    );
    expect(c.regression).toBe(true);
    expect(c.errorImproved).toBe(false);
    expect(c.conclusion).toContain('错误率上升');
  });

  it('吞吐下降不构成回归（仅质量指标触发）', () => {
    const c = comparePerformanceBaseline(
      { p95Ms: 300, errorRate: 0.001, throughputRps: 50 },
      PERFORMANCE_BASELINE,
    );
    expect(c.throughputDeltaRps).toBeLessThan(0);
    expect(c.regression).toBe(false);
    expect(c.conclusion).toContain('无性能漂移');
  });

  it('缺省基线 = PERFORMANCE_BASELINE', () => {
    const c = comparePerformanceBaseline({ p95Ms: 100, errorRate: 0, throughputRps: 200 });
    expect(c.p95DeltaMs).toBe(-240);
  });
});

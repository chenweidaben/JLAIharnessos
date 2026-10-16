/**
 * 健澜科技 jlmedaios - M180-D 系统性能与稳定性持续优化 V2 纯函数单元测试
 *
 * 【质量与体验】覆盖：
 *  - deepPerformanceOptimizationV2：四大优化域齐全（索引/缓存/前端/服务器），
 *    慢查询 TOP10 降序、索引建议条数、缓存平均命中率提升、P95 106→72；
 *  - benchmarkPerformanceV2：五维 delta / pct 计算，faster/slower/same 判定；
 *  - detectPerformanceRegressionV2：P95 / 错误率 / 吞吐三维 warning/critical 分级，
 *    history 为空时无信号；
 *  - buildSLOV2：错误率 / 延迟 / 可用率三项 met 判定，met/at_risk/breached 状态机，
 *    errorBurnRate = 实际/目标；
 *  - 纯函数性：两次调用结果深相等（不读时钟 / 不访问 IO）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildSLOV2,
  benchmarkPerformanceV2,
  CURRENT_SLO_INPUT_V2,
  detectPerformanceRegressionV2,
  deepPerformanceOptimizationV2,
  OPTIMIZED_BASELINE_V2,
  OPTIMIZED_CURRENT_V2,
  RECENT_PERF_HISTORY_V2,
  type BenchmarkV2Result,
  type DeepPerformanceV2Report,
  type RegressionPointV2,
  type SLOV2,
} from '../../src/bff/aggregators/perfOptV2Aggregator.js';

/* ---------------- deepPerformanceOptimizationV2 ---------------- */

describe('deepPerformanceOptimizationV2 四大优化域', () => {
  it('返回结构包含索引/缓存/前端/服务器四大域', () => {
    const report = deepPerformanceOptimizationV2();
    expect(report.indexing).toBeDefined();
    expect(report.cache).toBeDefined();
    expect(report.frontend).toBeDefined();
    expect(report.server).toBeDefined();
    expect(report.server.connectionPool).toBeDefined();
    expect(report.server.threadPool).toBeDefined();
    expect(report.server.runtimeParams.length).toBeGreaterThan(0);
    expect(report.server.osParams.length).toBeGreaterThan(0);
  });

  it('慢查询 TOP10 共 10 条，按优化前耗时降序', () => {
    const { slowQueryTop10 } = deepPerformanceOptimizationV2().indexing;
    expect(slowQueryTop10.length).toBe(10);
    for (let i = 1; i < slowQueryTop10.length; i++) {
      expect(slowQueryTop10[i].beforeMs).toBeLessThanOrEqual(slowQueryTop10[i - 1].beforeMs);
    }
  });

  it('每条慢查询优化后耗时严格小于优化前，节省为正', () => {
    const { slowQueryTop10 } = deepPerformanceOptimizationV2().indexing;
    for (const row of slowQueryTop10) {
      expect(row.afterMs).toBeLessThan(row.beforeMs);
      expect(row.afterMs).toBeGreaterThan(0);
      expect(row.savedMs).toBe(row.beforeMs - row.afterMs);
      expect(row.savedPct).toBeGreaterThan(0);
      expect(row.savedPct).toBeLessThan(100);
    }
  });

  it('索引建议条数 ≥5，覆盖 btree/covering/partial/gin 四类', () => {
    const { indexRecommendations, summary } = deepPerformanceOptimizationV2().indexing;
    expect(indexRecommendations.length).toBeGreaterThanOrEqual(5);
    expect(summary.indexCount).toBe(indexRecommendations.length);
    const kinds = new Set(indexRecommendations.map((r) => r.kind));
    expect(kinds.has('btree')).toBe(true);
    expect(kinds.has('covering')).toBe(true);
    expect(kinds.has('partial')).toBe(true);
    expect(kinds.has('gin')).toBe(true);
  });

  it('索引建议的扫描行数优化后严格小于优化前', () => {
    const { indexRecommendations } = deepPerformanceOptimizationV2().indexing;
    for (const r of indexRecommendations) {
      expect(r.scannedRowsAfterPerDay).toBeLessThan(r.scannedRowsBeforePerDay);
    }
  });

  it('缓存规则包含缓存键/TTL/失效/预热四要素，命中率前后提升', () => {
    const { rules, summary } = deepPerformanceOptimizationV2().cache;
    expect(rules.length).toBeGreaterThanOrEqual(5);
    for (const r of rules) {
      expect(r.key).toContain('cache:');
      expect(r.ttlSec).toBeGreaterThan(0);
      expect(r.invalidation.length).toBeGreaterThan(0);
      expect(r.hitRateAfterPct).toBeGreaterThan(r.hitRateBeforePct);
    }
    expect(summary.avgHitRateAfterPct).toBeGreaterThan(summary.avgHitRateBeforePct);
    expect(summary.warmupKeys).toBeGreaterThan(0);
  });

  it('前端优化项覆盖懒加载/代码分割/预加载/CDN', () => {
    const { items, summary } = deepPerformanceOptimizationV2().frontend;
    const areas = items.map((i) => i.area).join('|');
    expect(areas).toContain('懒加载');
    expect(areas).toContain('代码分割');
    expect(areas).toContain('预加载');
    expect(areas).toContain('CDN');
    expect(summary.bundleKbAfter).toBeLessThan(summary.bundleKbBefore);
    expect(summary.lcpAfterMs).toBeLessThan(summary.lcpBeforeMs);
  });

  it('总览 P95 从 106ms 降到 72ms，结论为 improved', () => {
    const { summary } = deepPerformanceOptimizationV2();
    expect(summary.p95BeforeMs).toBe(106);
    expect(summary.p95AfterMs).toBe(72);
    expect(summary.overallVerdict).toBe('improved');
  });

  it('纯函数：两次调用深相等', () => {
    const a = deepPerformanceOptimizationV2();
    const b = deepPerformanceOptimizationV2();
    expect(a).toEqual(b);
  });
});

/* ---------------- benchmarkPerformanceV2 ---------------- */

describe('benchmarkPerformanceV2 五维基准对比', () => {
  it('优化后采样相对基线判定为 faster（P95↓≥5% 且 吞吐↑≥5% 且错误率未恶化）', () => {
    const r: BenchmarkV2Result = benchmarkPerformanceV2(OPTIMIZED_BASELINE_V2, OPTIMIZED_CURRENT_V2);
    expect(r.verdict).toBe('faster');
    expect(r.p95Improved).toBe(true);
    expect(r.throughputImproved).toBe(true);
    expect(r.errorRateNotWorse).toBe(true);
    // P95 下降：106 → 72，约 -32.1%
    expect(r.pct.p95).toBeLessThan(-5);
    // 吞吐上升：820 → 1180，约 +43.9%
    expect(r.pct.throughput).toBeGreaterThan(5);
  });

  it('delta = current - baseline（延迟为负=变快）', () => {
    const r = benchmarkPerformanceV2(OPTIMIZED_BASELINE_V2, OPTIMIZED_CURRENT_V2);
    expect(r.delta.p95Ms).toBe(72 - 106);
    expect(r.delta.p99Ms).toBe(132 - 188);
    expect(r.delta.throughputRps).toBe(1180 - 820);
  });

  it('P95 上升 ≥5% 判定为 slower', () => {
    const worse = { ...OPTIMIZED_CURRENT_V2, p95Ms: 130, throughputRps: 800 };
    const r = benchmarkPerformanceV2(OPTIMIZED_BASELINE_V2, worse);
    expect(r.verdict).toBe('slower');
  });

  it('除零安全：基线为 0 时不抛异常，pct 为 0', () => {
    const zero = { p50Ms: 0, p95Ms: 0, p99Ms: 0, avgMs: 0, errorRatePct: 0, throughputRps: 0 };
    expect(() => benchmarkPerformanceV2(zero, OPTIMIZED_CURRENT_V2)).not.toThrow();
    const r = benchmarkPerformanceV2(zero, OPTIMIZED_CURRENT_V2);
    expect(r.pct.p95).toBe(0);
  });
});

/* ---------------- detectPerformanceRegressionV2 ---------------- */

describe('detectPerformanceRegressionV2 三维退化检测', () => {
  it('优化后现状（P95 下降、错误率下降、吞吐上升）不触发退化', () => {
    const r = detectPerformanceRegressionV2(
      {
        p95Ms: OPTIMIZED_CURRENT_V2.p95Ms,
        errorRatePct: OPTIMIZED_CURRENT_V2.errorRatePct,
        throughputRps: OPTIMIZED_CURRENT_V2.throughputRps,
      },
      RECENT_PERF_HISTORY_V2,
    );
    expect(r.regressed).toBe(false);
    expect(r.signals.length).toBe(0);
  });

  it('P95 飙升 ≥ 基线×1.5 触发 critical', () => {
    // 基线 P95 ≈ (118+114+110+106+96+84+76)/7 ≈ 100.6；×1.5 ≈ 151
    const r = detectPerformanceRegressionV2(
      { p95Ms: 220, errorRatePct: 0.1, throughputRps: 900 },
      RECENT_PERF_HISTORY_V2,
    );
    expect(r.regressed).toBe(true);
    const p95Signal = r.signals.find((s) => s.metric === 'p95Ms');
    expect(p95Signal).toBeDefined();
    expect(p95Signal!.severity).toBe('critical');
  });

  it('错误率 ≥1.0% 触发 critical，≥0.5% 触发 warning', () => {
    const crit = detectPerformanceRegressionV2(
      { p95Ms: 90, errorRatePct: 1.2, throughputRps: 900 },
      RECENT_PERF_HISTORY_V2,
    );
    const errCrit = crit.signals.find((s) => s.metric === 'errorRatePct');
    expect(errCrit?.severity).toBe('critical');

    const warn = detectPerformanceRegressionV2(
      { p95Ms: 90, errorRatePct: 0.6, throughputRps: 900 },
      RECENT_PERF_HISTORY_V2,
    );
    const errWarn = warn.signals.find((s) => s.metric === 'errorRatePct');
    expect(errWarn?.severity).toBe('warning');
  });

  it('吞吐 ≤ 基线×0.6 触发 critical（吞吐下降也是退化）', () => {
    // 基线吞吐 ≈ (760+780+800+820+900+1020+1120)/7 ≈ 885.7；×0.6 ≈ 531
    const r = detectPerformanceRegressionV2(
      { p95Ms: 90, errorRatePct: 0.1, throughputRps: 400 },
      RECENT_PERF_HISTORY_V2,
    );
    const rps = r.signals.find((s) => s.metric === 'throughputRps');
    expect(rps).toBeDefined();
    expect(rps!.severity).toBe('critical');
  });

  it('history 为空时不产生信号，baseline 回落到当前值', () => {
    const empty: readonly RegressionPointV2[] = [];
    const r = detectPerformanceRegressionV2({ p95Ms: 90, errorRatePct: 0.1, throughputRps: 900 }, empty);
    expect(r.regressed).toBe(false);
    expect(r.signals.length).toBe(0);
    expect(r.baseline.p95Ms).toBe(90);
  });
});

/* ---------------- buildSLOV2 ---------------- */

describe('buildSLOV2 服务等级目标', () => {
  it('优化后现状三项全达成 → met，errorBurnRate = 0.08/0.1 = 0.8', () => {
    const slo: SLOV2 = buildSLOV2(
      CURRENT_SLO_INPUT_V2.errorRatePct,
      CURRENT_SLO_INPUT_V2.p95LatencyMs,
      CURRENT_SLO_INPUT_V2.availabilityPct,
    );
    expect(slo.errorRate.met).toBe(true);
    expect(slo.latency.met).toBe(true);
    expect(slo.availability.met).toBe(true);
    expect(slo.overall.status).toBe('met');
    expect(slo.overall.score).toBe(100);
    expect(slo.overall.errorBurnRate).toBe(0.8);
  });

  it('1 项未达 → at_risk；2 项及以上未达 → breached', () => {
    const atRisk = buildSLOV2(0.25, 150, 99.95); // 错误率超
    expect(atRisk.overall.status).toBe('at_risk');

    const breached = buildSLOV2(0.25, 300, 99.5); // 错误率 + 延迟 + 可用率全超
    expect(breached.overall.status).toBe('breached');
  });

  it('默认目标：错误率 ≤0.1% / P95 ≤200ms / 可用率 ≥99.9%', () => {
    const slo = buildSLOV2(0.1, 200, 99.9);
    expect(slo.errorRate.targetPct).toBe(0.1);
    expect(slo.latency.p95TargetMs).toBe(200);
    expect(slo.availability.targetPct).toBe(99.9);
    // 边界值恰好等于目标视为达成
    expect(slo.errorRate.met).toBe(true);
    expect(slo.latency.met).toBe(true);
    expect(slo.availability.met).toBe(true);
  });

  it('纯函数：两次调用深相等', () => {
    const a = buildSLOV2(0.08, 72, 99.95);
    const b = buildSLOV2(0.08, 72, 99.95);
    expect(a).toEqual(b);
  });
});

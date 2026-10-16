/**
 * 健澜科技 jlmedaios - M151-D 系统性能持续优化纯函数单元测试
 *
 * 【质量补齐与新场景】覆盖：
 *  - optimizeSlowQueries：慢查询识别（三类问题齐全）、优化动作映射、
 *    savedMs/savedPct 计算、summary 聚合确定性；
 *  - getPerformanceImprovementReport：优化前后分位数对比、delta 计算、
 *    P95 目标 106ms → <80ms 达成校验；
 *  - 纯函数性：两次调用结果深相等（不读时钟 / 不访问 IO）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildSLO,
  benchmarkPerformance,
  detectPerformanceRegression,
  deepPerformanceOptimization,
  getPerformanceImprovementReport,
  optimizeSlowQueries,
  P95_TARGET_MS,
  type BenchmarkResult,
  type Comparison,
  type OptimizationReport,
  type RegressionPoint,
} from '../../src/bff/aggregators/perfOptimizeAggregator.js';

describe('optimizeSlowQueries 慢查询识别', () => {
  it('返回 6 条确定性慢查询，覆盖三类问题', () => {
    const report = optimizeSlowQueries();
    expect(report.issues.length).toBe(6);
    expect(report.summary.totalIdentified).toBe(6);
    expect(report.summary.byKind.N_PLUS_ONE).toBe(2);
    expect(report.summary.byKind.MISSING_INDEX).toBe(2);
    expect(report.summary.byKind.AGG_NO_MVIEW).toBe(2);
  });

  it('慢查询按优化前耗时降序排列', () => {
    const { issues } = optimizeSlowQueries();
    for (let i = 1; i < issues.length; i++) {
      expect(issues[i].beforeMs).toBeLessThanOrEqual(issues[i - 1].beforeMs);
    }
  });

  it('每条 issue 都对应一条优化动作，且措施类别正确', () => {
    const { issues, actions } = optimizeSlowQueries();
    expect(actions.length).toBe(issues.length);
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const action = actions.find((a) => a.issueId === issue.id);
      expect(action).toBeDefined();
      if (issue.kind === 'N_PLUS_ONE') expect(action!.measure).toBe('BATCH_LOAD');
      if (issue.kind === 'MISSING_INDEX') expect(action!.measure).toBe('ADD_INDEX');
      if (issue.kind === 'AGG_NO_MVIEW') expect(action!.measure).toBe('MATERIALIZED_VIEW');
    }
  });

  it('优化后耗时严格小于优化前（优化有效）', () => {
    const { issues } = optimizeSlowQueries();
    for (const issue of issues) {
      expect(issue.afterMs).toBeLessThan(issue.beforeMs);
      expect(issue.afterMs).toBeGreaterThan(0);
    }
  });

  it('savedMs 与 savedPct 计算正确', () => {
    const { actions } = optimizeSlowQueries();
    for (const action of actions) {
      expect(action.savedMs).toBeGreaterThan(0);
      expect(action.savedPct).toBeGreaterThan(0);
      expect(action.savedPct).toBeLessThanOrEqual(100);
    }
  });

  it('加权累计节省耗时为正，平均降幅为正', () => {
    const { summary } = optimizeSlowQueries();
    expect(summary.totalSavedMsPerDay).toBeGreaterThan(0);
    expect(summary.avgImprovementPct).toBeGreaterThan(0);
    expect(summary.avgImprovementPct).toBeLessThan(100);
  });
});

describe('getPerformanceImprovementReport 效果对比', () => {
  it('优化前 P95 = 106ms（任务给定基线）', () => {
    const report = getPerformanceImprovementReport();
    expect(report.before.p95).toBe(106);
  });

  it('优化后 P95 < 80ms，目标达成', () => {
    const report = getPerformanceImprovementReport();
    expect(report.after.p95).toBeLessThan(P95_TARGET_MS);
    expect(report.target.p95TargetMs).toBe(80);
    expect(report.target.p95Met).toBe(true);
  });

  it('P50/P95/P99/avg 全部下降（delta 为负）', () => {
    const report = getPerformanceImprovementReport();
    expect(report.delta.p50Ms).toBeLessThan(0);
    expect(report.delta.p95Ms).toBeLessThan(0);
    expect(report.delta.p99Ms).toBeLessThan(0);
    expect(report.delta.avgMs).toBeLessThan(0);
  });

  it('P95 降幅百分比计算正确（106→72 ≈ 32.1%）', () => {
    const report: Comparison = getPerformanceImprovementReport();
    expect(report.delta.p95ReductionPct).toBeGreaterThan(30);
    expect(report.delta.p95ReductionPct).toBeLessThan(35);
  });

  it('delta 与 before/after 数值一致', () => {
    const report = getPerformanceImprovementReport();
    expect(report.delta.p95Ms).toBe(report.after.p95 - report.before.p95);
    expect(report.delta.avgMs).toBe(report.after.avg - report.before.avg);
  });
});

describe('纯函数确定性', () => {
  it('两次调用 optimizeSlowQueries 深相等', () => {
    const a: OptimizationReport = optimizeSlowQueries();
    const b: OptimizationReport = optimizeSlowQueries();
    expect(a).toEqual(b);
  });

  it('两次调用 getPerformanceImprovementReport 深相等', () => {
    const a = getPerformanceImprovementReport();
    const b = getPerformanceImprovementReport();
    expect(a).toEqual(b);
  });
});

/* ================= M171-D 系统性能与稳定性持续优化（科研教学后勤） ================= */

describe('deepPerformanceOptimization 深度性能优化', () => {
  it('慢查询 TOP10 共 10 条，按优化前耗时降序', () => {
    const { slowQueryTop10 } = deepPerformanceOptimization();
    expect(slowQueryTop10.length).toBe(10);
    for (let i = 1; i < slowQueryTop10.length; i++) {
      expect(slowQueryTop10[i].beforeMs).toBeLessThanOrEqual(slowQueryTop10[i - 1].beforeMs);
    }
  });

  it('每条 TOP10 至少命中一项优化手段（加索引/改写SQL/批量加载）', () => {
    const { slowQueryTop10 } = deepPerformanceOptimization();
    for (const row of slowQueryTop10) {
      expect(row.levers.length).toBeGreaterThan(0);
      expect(row.afterMs).toBeLessThan(row.beforeMs);
      expect(row.afterMs).toBeGreaterThan(0);
      expect(row.savedMs).toBe(row.beforeMs - row.afterMs);
      expect(row.savedPct).toBeGreaterThan(0);
      expect(row.savedPct).toBeLessThanOrEqual(100);
      expect(row.leverLabels.length).toBe(row.levers.length);
    }
  });

  it('连接池优化：最大连接数/超时/等待均改善，重试 3 次指数退避', () => {
    const { connectionPool } = deepPerformanceOptimization();
    expect(connectionPool.after.max).toBeGreaterThan(connectionPool.before.max);
    expect(connectionPool.after.acquireTimeoutMs).toBeLessThan(connectionPool.before.acquireTimeoutMs);
    expect(connectionPool.after.waitP95Ms).toBeLessThan(connectionPool.before.waitP95Ms);
    expect(connectionPool.retry.attempts).toBe(3);
    expect(connectionPool.retry.backoffBaseMs).toBeGreaterThan(0);
  });

  it('缓存策略：5 条规则、命中率提升、预热键 3 个', () => {
    const { cacheStrategy } = deepPerformanceOptimization();
    expect(cacheStrategy.rules.length).toBe(5);
    expect(cacheStrategy.summary.warmupKeys).toBe(3);
    expect(cacheStrategy.summary.avgHitRateAfterPct).toBeGreaterThan(cacheStrategy.summary.avgHitRateBeforePct);
    for (const rule of cacheStrategy.rules) {
      expect(rule.key).toContain('{');
      expect(rule.ttlSec).toBeGreaterThan(0);
      expect(rule.hitRateAfterPct).toBeGreaterThan(rule.hitRateBeforePct);
    }
  });

  it('前端优化：4 项（懒加载/代码分割/预加载），bundle 与 LCP 均下降', () => {
    const { frontend } = deepPerformanceOptimization();
    expect(frontend.items.length).toBe(4);
    expect(frontend.summary.bundleKbAfter).toBeLessThan(frontend.summary.bundleKbBefore);
    expect(frontend.summary.lcpAfterMs).toBeLessThan(frontend.summary.lcpBeforeMs);
  });

  it('汇总：P95 106→72ms，判定 improved，日省耗时为正', () => {
    const rep = deepPerformanceOptimization();
    expect(rep.summary.p95BeforeMs).toBe(106);
    expect(rep.summary.p95AfterMs).toBe(72);
    expect(rep.summary.overallVerdict).toBe('improved');
    expect(rep.summary.slowQueryTotalSavedMsPerDay).toBeGreaterThan(0);
  });

  it('纯函数确定性：两次调用深相等', () => {
    expect(deepPerformanceOptimization()).toEqual(deepPerformanceOptimization());
  });
});

describe('benchmarkPerformance 基准对比', () => {
  const baseline = { p50Ms: 42, p95Ms: 106, p99Ms: 188, avgMs: 58, errorRatePct: 0.18, throughputRps: 820 };
  const current = { p50Ms: 26, p95Ms: 72, p99Ms: 132, avgMs: 36, errorRatePct: 0.08, throughputRps: 1180 };

  it('优化后判定 faster，P95 改善且错误率未恶化', () => {
    const r: BenchmarkResult = benchmarkPerformance(baseline, current);
    expect(r.verdict).toBe('faster');
    expect(r.p95Improved).toBe(true);
    expect(r.errorRateNotWorse).toBe(true);
  });

  it('delta 与 pct 符号正确（延迟下降为负、吞吐上升为正）', () => {
    const r = benchmarkPerformance(baseline, current);
    expect(r.delta.p95Ms).toBe(-34);
    expect(r.pct.p95).toBeLessThan(-5);
    expect(r.delta.throughputRps).toBe(360);
    expect(r.pct.throughput).toBeGreaterThan(30);
  });

  it('P95 上升 ≥5% 判定 slower', () => {
    const worse = { ...baseline, p95Ms: 130 };
    expect(benchmarkPerformance(baseline, worse).verdict).toBe('slower');
  });

  it('基线为 0 时除零安全，不抛异常', () => {
    const zero = { p50Ms: 0, p95Ms: 0, p99Ms: 0, avgMs: 0, errorRatePct: 0, throughputRps: 0 };
    const r = benchmarkPerformance(zero, current);
    expect(r.pct.p95).toBe(0);
    expect(typeof r.verdict).toBe('string');
  });
});

describe('detectPerformanceRegression 退化检测', () => {
  const history: RegressionPoint[] = [
    { window: 'D-6', p95Ms: 110, errorRatePct: 0.2 },
    { window: 'D-5', p95Ms: 104, errorRatePct: 0.18 },
    { window: 'D-4', p95Ms: 100, errorRatePct: 0.16 },
  ];

  it('现状优于基线时无退化信号', () => {
    const r = detectPerformanceRegression({ p95Ms: 70, errorRatePct: 0.08 }, history);
    expect(r.regressed).toBe(false);
    expect(r.signals.length).toBe(0);
  });

  it('P95 ≥ 历史均值 1.5 倍触发 critical 退化', () => {
    const r = detectPerformanceRegression({ p95Ms: 200, errorRatePct: 0.1 }, history);
    expect(r.regressed).toBe(true);
    const sig = r.signals.find((s) => s.metric === 'p95Ms');
    expect(sig?.severity).toBe('critical');
  });

  it('错误率 ≥1.0% 触发 critical，≥0.5% 触发 warning', () => {
    expect(detectPerformanceRegression({ p95Ms: 80, errorRatePct: 1.2 }, history).signals[0].severity).toBe('critical');
    expect(detectPerformanceRegression({ p95Ms: 80, errorRatePct: 0.6 }, history).signals[0].severity).toBe('warning');
  });

  it('历史为空时不产生信号（无法对比）', () => {
    const r = detectPerformanceRegression({ p95Ms: 500, errorRatePct: 2.0 }, []);
    expect(r.regressed).toBe(false);
    expect(r.signals.length).toBe(0);
  });
});

describe('buildSLO 服务等级目标', () => {
  it('三项全达成：met，score=100，burnRate 正确', () => {
    const slo = buildSLO(0.08, 72, 99.95);
    expect(slo.overall.status).toBe('met');
    expect(slo.overall.score).toBe(100);
    expect(slo.errorRate.met).toBe(true);
    expect(slo.latency.met).toBe(true);
    expect(slo.availability.met).toBe(true);
    expect(slo.overall.errorBurnRate).toBeCloseTo(0.8, 1);
  });

  it('一项未达：at_risk，score=66.7', () => {
    const slo = buildSLO(0.05, 50, 99.8);
    expect(slo.overall.status).toBe('at_risk');
    expect(slo.availability.met).toBe(false);
    expect(slo.overall.score).toBeCloseTo(66.7, 1);
  });

  it('两项及以上未达：breached，score=33.3', () => {
    const slo = buildSLO(1.2, 300, 99.95);
    expect(slo.overall.status).toBe('breached');
    expect(slo.errorRate.met).toBe(false);
    expect(slo.latency.met).toBe(false);
    expect(slo.availability.met).toBe(true);
    expect(slo.overall.score).toBeCloseTo(33.3, 1);
  });
});

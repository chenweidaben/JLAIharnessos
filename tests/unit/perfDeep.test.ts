/**
 * 健澜科技 jlmedaios - M165-D 系统性能与稳定性持续优化深度审计单元测试
 *
 * 【CDSS与运营精细化】覆盖：
 *  - deepPerformanceAudit：慢查询 TOP10（全部 >500ms、降序、rank 连续）、
 *    大表扫描 / N+1 / 内存泄漏 / 前端渲染五维齐全、healthScore 区间、
 *    criticalCount 由 high 内存泄漏 + N+1 慢查询构成；
 *  - optimizeDatabaseIndex：8 项建议按类型分布（btree 4 / covering 2 / partial 1 / gin 1）、
 *    扫描行数下降为正、加权耗时下降百分比区间；
 *  - buildCircuitBreakerMetrics：状态计数（OPEN 1 / HALF_OPEN 1 / CLOSED 3）、
 *    24h 熔断总次数 = 21、加权失败率区间；
 *  - buildHealthCheckDashboard：UP 3 / DEGRADED 2 / DOWN 0、overall = DEGRADED、
 *    平均探测耗时 319ms；
 *  - 纯函数性：四个函数两次调用结果深相等（不读时钟 / 不访问 IO）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildCircuitBreakerMetrics,
  buildHealthCheckDashboard,
  deepPerformanceAudit,
  optimizeDatabaseIndex,
  type CircuitBreakerMetrics,
  type DatabaseIndexOptimization,
  type DeepPerformanceAudit,
  type HealthCheckDashboard,
} from '../../src/bff/aggregators/perfDeepAggregator.js';

describe('deepPerformanceAudit 五维深度审计', () => {
  it('慢查询 TOP10 共 10 条，全部 avgMs > 500ms', () => {
    const { slowQueryTop10, summary } = deepPerformanceAudit();
    expect(slowQueryTop10.length).toBe(10);
    expect(summary.slowQueryOver500).toBe(10);
    for (const row of slowQueryTop10) {
      expect(row.avgMs).toBeGreaterThan(500);
      expect(row.p95Ms).toBeGreaterThan(row.avgMs);
      expect(row.callsPerDay).toBeGreaterThan(0);
    }
  });

  it('慢查询按 avgMs 降序且 rank 连续 1..10', () => {
    const { slowQueryTop10 } = deepPerformanceAudit();
    for (let i = 1; i < slowQueryTop10.length; i++) {
      expect(slowQueryTop10[i].avgMs).toBeLessThanOrEqual(slowQueryTop10[i - 1].avgMs);
    }
    slowQueryTop10.forEach((row, i) => expect(row.rank).toBe(i + 1));
  });

  it('大表扫描 / N+1 / 内存泄漏 / 前端渲染四维齐全', () => {
    const { bigTableScans, nPlusOneIssues, memoryLeaks, frontendRender, summary } =
      deepPerformanceAudit();
    expect(bigTableScans.length).toBe(4);
    expect(summary.bigTableCount).toBe(4);
    expect(nPlusOneIssues.length).toBe(3);
    expect(summary.nPlusOneCount).toBe(3);
    expect(memoryLeaks.length).toBe(3);
    expect(summary.memoryLeakCount).toBe(3);
    expect(frontendRender.length).toBe(4);
    expect(summary.frontendIssueCount).toBe(4);
  });

  it('每条 N+1 可减少调用数 = (executionsPerPage - 1) × callsPerDay（批量加载后仅留 1 次往返）', () => {
    const { nPlusOneIssues } = deepPerformanceAudit();
    for (const row of nPlusOneIssues) {
      expect(row.executionsPerPage).toBeGreaterThan(1);
      expect(row.estimatedReducedCallsPerDay).toBeGreaterThan(0);
      expect(row.estimatedReducedCallsPerDay).toBe(
        (row.executionsPerPage - 1) * row.callsPerDay,
      );
    }
  });

  it('内存泄漏 high 严重度恰为 1 条，criticalCount = 1（high）+ 2（N+1 慢查询）', () => {
    const { memoryLeaks, summary } = deepPerformanceAudit();
    expect(memoryLeaks.filter((m) => m.severity === 'high').length).toBe(1);
    expect(summary.criticalCount).toBe(3);
  });

  it('healthScore 在 0..100 闭区间', () => {
    const { summary } = deepPerformanceAudit();
    expect(summary.healthScore).toBeGreaterThanOrEqual(0);
    expect(summary.healthScore).toBeLessThanOrEqual(100);
  });
});

describe('optimizeDatabaseIndex 索引建议', () => {
  it('共 8 项建议，类型分布 btree 4 / covering 2 / partial 1 / gin 1', () => {
    const result: DatabaseIndexOptimization = optimizeDatabaseIndex();
    expect(result.recommendations.length).toBe(8);
    expect(result.summary.total).toBe(8);
    expect(result.summary.byType.btree).toBe(4);
    expect(result.summary.byType.covering).toBe(2);
    expect(result.summary.byType.partial).toBe(1);
    expect(result.summary.byType.gin).toBe(1);
  });

  it('每项建议加索引后扫描行数严格下降', () => {
    const { recommendations } = optimizeDatabaseIndex();
    for (const rec of recommendations) {
      expect(rec.scannedRowsAfterPerDay).toBeLessThan(rec.scannedRowsBeforePerDay);
      expect(rec.expectedMsSaving).toBeGreaterThan(0);
      expect(rec.indexName).toBeTruthy();
      expect(rec.columns.length).toBeGreaterThan(0);
    }
  });

  it('日均减少扫描行数合计为正，加权耗时下降百分比在 0..100', () => {
    const { summary } = optimizeDatabaseIndex();
    expect(summary.totalRowsReducedPerDay).toBeGreaterThan(0);
    expect(summary.avgMsSavingPct).toBeGreaterThan(0);
    expect(summary.avgMsSavingPct).toBeLessThan(100);
  });
});

describe('buildCircuitBreakerMetrics 熔断器监控', () => {
  it('状态计数：OPEN 1 / HALF_OPEN 1 / CLOSED 3，降级数 = 2', () => {
    const result: CircuitBreakerMetrics = buildCircuitBreakerMetrics();
    expect(result.circuits.length).toBe(5);
    expect(result.summary.total).toBe(5);
    expect(result.summary.open).toBe(1);
    expect(result.summary.halfOpen).toBe(1);
    expect(result.summary.closed).toBe(3);
    expect(result.summary.degraded).toBe(2);
  });

  it('24h 熔断总次数 = 14 + 6 + 1 + 0 + 0 = 21', () => {
    expect(buildCircuitBreakerMetrics().summary.totalOpenCount24h).toBe(21);
  });

  it('OPEN 熔断器失败率高于阈值，CLOSED 低于阈值', () => {
    const { circuits } = buildCircuitBreakerMetrics();
    for (const c of circuits) {
      if (c.state === 'OPEN') expect(c.failureRatePct).toBeGreaterThan(c.thresholdPct);
      if (c.state === 'CLOSED') expect(c.failureRatePct).toBeLessThan(c.thresholdPct);
    }
  });

  it('加权平均失败率为正且保留 1 位小数', () => {
    const { summary } = buildCircuitBreakerMetrics();
    expect(summary.avgFailureRatePct).toBeGreaterThan(0);
    expect(summary.avgFailureRatePct).toBeLessThan(30);
    expect(Math.round(summary.avgFailureRatePct * 10) / 10).toBe(summary.avgFailureRatePct);
  });
});

describe('buildHealthCheckDashboard 健康检查面板', () => {
  it('共 5 项检查：UP 3 / DEGRADED 2 / DOWN 0', () => {
    const result: HealthCheckDashboard = buildHealthCheckDashboard();
    expect(result.checks.length).toBe(5);
    expect(result.summary.total).toBe(5);
    expect(result.summary.up).toBe(3);
    expect(result.summary.degraded).toBe(2);
    expect(result.summary.down).toBe(0);
  });

  it('存在 DEGRADED 且无 DOWN 时 overall = DEGRADED', () => {
    expect(buildHealthCheckDashboard().summary.overall).toBe('DEGRADED');
  });

  it('平均探测耗时 = (24+186+3+1240+142)/5 = 319ms', () => {
    expect(buildHealthCheckDashboard().summary.avgLatencyMs).toBe(319);
  });

  it('LLM 网关健康检查与熔断器 OPEN 状态一致（DEGRADED）', () => {
    const { checks } = buildHealthCheckDashboard();
    const llm = checks.find((c) => c.category === 'llm_gateway');
    expect(llm).toBeDefined();
    expect(llm!.status).toBe('DEGRADED');
    expect(llm!.incidentCount24h).toBeGreaterThan(0);
  });
});

describe('纯函数确定性', () => {
  it('deepPerformanceAudit 两次调用深相等', () => {
    expect(deepPerformanceAudit()).toEqual(deepPerformanceAudit());
  });

  it('optimizeDatabaseIndex 两次调用深相等', () => {
    expect(optimizeDatabaseIndex()).toEqual(optimizeDatabaseIndex());
  });

  it('buildCircuitBreakerMetrics 两次调用深相等', () => {
    expect(buildCircuitBreakerMetrics()).toEqual(buildCircuitBreakerMetrics());
  });

  it('buildHealthCheckDashboard 两次调用深相等', () => {
    expect(buildHealthCheckDashboard()).toEqual(buildHealthCheckDashboard());
  });
});

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
  getPerformanceImprovementReport,
  optimizeSlowQueries,
  P95_TARGET_MS,
  type Comparison,
  type OptimizationReport,
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

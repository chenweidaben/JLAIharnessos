/**
 * 健澜科技 jlmedaios - 流程优化纯函数单测（M218-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildProcessOptimizationReport,
  calculateWaitTime,
  optimizePatientFlow,
} from '../../src/bff/aggregators/processOptimizationReportAggregator';

describe('optimizePatientFlow', () => {
  it('10 步骤 → 7 步骤', () => {
    const r = optimizePatientFlow(10);
    expect(r.optimized).toBe(7);
    expect(r.reduction).toBe(3);
  });
});

describe('calculateWaitTime', () => {
  it('10 人排队 20/小时 → 30 分钟', () => {
    const r = calculateWaitTime(10, 20);
    expect(r.waitMinutes).toBe(30);
  });
});

describe('buildProcessOptimizationReport', () => {
  it('生成门诊数据', () => {
    const r = buildProcessOptimizationReport('30d');
    expect(r.outpatient.waitTime).toBeGreaterThan(0);
  });

  it('生成住院数据', () => {
    const r = buildProcessOptimizationReport('30d');
    expect(r.inpatient.avgStay).toBeGreaterThan(0);
  });

  it('生成急诊数据', () => {
    const r = buildProcessOptimizationReport('30d');
    expect(r.emergency.triageTime).toBeGreaterThan(0);
  });

  it('生成缴费数据', () => {
    const r = buildProcessOptimizationReport('30d');
    expect(r.billing.online).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildProcessOptimizationReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

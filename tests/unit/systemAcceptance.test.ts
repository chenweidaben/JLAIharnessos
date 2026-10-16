/**
 * 健澜科技 jlmedaios - 系统验收纯函数单测（M200-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildSystemAcceptanceReport,
  generateAcceptanceSummary,
  runEndToEndTest,
  type FlowData,
  type TestResults,
} from '../../src/bff/aggregators/systemAcceptanceAggregator';

describe('runEndToEndTest', () => {
  it('有效流程 → 通过', () => {
    const flow: FlowData = { name: '门诊挂号', steps: 5, expectedOutcome: '挂号成功' };
    expect(runEndToEndTest(flow).passed).toBe(true);
  });

  it('空流程 → 不通过', () => {
    const flow: FlowData = { name: '空', steps: 0, expectedOutcome: '' };
    expect(runEndToEndTest(flow).passed).toBe(false);
  });
});

describe('generateAcceptanceSummary', () => {
  it('高通过率+UAT全过 → A', () => {
    const results: TestResults = {
      functional: { passed: 98, total: 100 },
      integration: { passed: 48, total: 50 },
      performance: { passed: true },
      security: { passed: true },
      compatibility: { passed: 19, total: 20 },
      uat: { doctor: true, nurse: true, pharmacist: true, admin: true, patient: true },
      migration: { passed: true },
    };
    expect(generateAcceptanceSummary(results).overallPass).toBe(true);
  });

  it('UAT有失败 → 不通过', () => {
    const results: TestResults = {
      functional: { passed: 98, total: 100 },
      integration: { passed: 48, total: 50 },
      performance: { passed: true },
      security: { passed: true },
      compatibility: { passed: 19, total: 20 },
      uat: { doctor: true, nurse: false, pharmacist: true, admin: true, patient: true },
      migration: { passed: true },
    };
    expect(generateAcceptanceSummary(results).overallPass).toBe(false);
  });
});

describe('buildSystemAcceptanceReport', () => {
  it('生成功能测试数据', () => {
    const r = buildSystemAcceptanceReport();
    expect(r.functional.outpatient).toBe(true);
  });

  it('生成UAT数据', () => {
    const r = buildSystemAcceptanceReport();
    expect(r.uat.doctor).toBe(true);
  });

  it('生成总结', () => {
    const r = buildSystemAcceptanceReport();
    expect(r.summary.grade).toBeDefined();
  });

  it('生成建议', () => {
    const r = buildSystemAcceptanceReport();
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

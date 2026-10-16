/**
 * 健澜科技 jlmedaios - 功能检查中心纯函数单测（M223-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPulmonaryFunction,
  buildFunctionalReport,
  interpretECG,
} from '../../src/bff/aggregators/functionalReportAggregator';

describe('interpretECG', () => {
  it('心率80 → 正常', () => {
    expect(interpretECG(80).normal).toBe(true);
  });

  it('心率120 → 心动过速', () => {
    expect(interpretECG(120).finding).toBe('窦性心动过速');
  });
});

describe('assessPulmonaryFunction', () => {
  it('FEV1 60 预计100 → 60% 重度', () => {
    expect(assessPulmonaryFunction(60, 100).grade).toBe('重度');
  });

  it('FEV1 95 预计100 → 95% 正常', () => {
    expect(assessPulmonaryFunction(95, 100).grade).toBe('正常');
  });
});

describe('buildFunctionalReport', () => {
  it('生成心电数据', () => {
    const r = buildFunctionalReport('30d');
    expect(r.ecg.routine).toBeGreaterThan(0);
  });

  it('生成内镜数据', () => {
    const r = buildFunctionalReport('30d');
    expect(r.endoscopy.gastro).toBeGreaterThan(0);
  });

  it('生成神经数据', () => {
    const r = buildFunctionalReport('30d');
    expect(r.neuro.eeg).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildFunctionalReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

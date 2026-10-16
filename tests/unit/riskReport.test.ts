/**
 * 健澜科技 jlmedaios - 风险管理纯函数单测（M217-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildRiskMatrix,
  buildRiskReport,
  calculateRiskScore,
  type RiskItem,
} from '../../src/bff/aggregators/riskReportAggregator';

describe('calculateRiskScore', () => {
  it('可能性 5 影响 5 → 25 高风险', () => {
    const r = calculateRiskScore(5, 5);
    expect(r.score).toBe(25);
    expect(r.level).toBe('高');
  });

  it('可能性 3 影响 3 → 9 中风险', () => {
    const r = calculateRiskScore(3, 3);
    expect(r.level).toBe('中');
  });

  it('可能性 1 影响 1 → 1 低风险', () => {
    const r = calculateRiskScore(1, 1);
    expect(r.level).toBe('低');
  });
});

describe('buildRiskMatrix', () => {
  it('3 风险：1高1中1低', () => {
    const risks: RiskItem[] = [
      { name: '纠纷', likelihood: 5, impact: 5 },
      { name: '感染', likelihood: 3, impact: 3 },
      { name: '声誉', likelihood: 1, impact: 1 },
    ];
    const r = buildRiskMatrix(risks);
    expect(r.high).toBe(1);
    expect(r.medium).toBe(1);
    expect(r.low).toBe(1);
  });
});

describe('buildRiskReport', () => {
  it('生成识别数据', () => {
    const r = buildRiskReport('30d');
    expect(r.identification.strategic).toBeGreaterThan(0);
  });

  it('生成医疗风险数据', () => {
    const r = buildRiskReport('30d');
    expect(r.medical.disputes).toBeGreaterThan(0);
  });

  it('生成委员会数据', () => {
    const r = buildRiskReport('30d');
    expect(r.committee.meetings).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildRiskReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

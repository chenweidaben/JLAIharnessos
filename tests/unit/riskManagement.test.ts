/**
 * 健澜科技 jlmedaios - 风险管理纯函数单测（M198-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessRiskLevel,
  buildRiskManagementReport,
  generateRiskResponse,
  type RiskData,
} from '../../src/bff/aggregators/riskManagementAggregator';

describe('assessRiskLevel', () => {
  it('5x5 → critical', () => {
    expect(assessRiskLevel(5, 5).level).toBe('critical');
  });

  it('1x1 → low', () => {
    expect(assessRiskLevel(1, 1).level).toBe('low');
  });

  it('3x4 → high', () => {
    expect(assessRiskLevel(3, 4).level).toBe('high');
  });
});

describe('generateRiskResponse', () => {
  it('高风险 → reduce', () => {
    const risk: RiskData = { riskType: 'safety', level: 'high' };
    expect(generateRiskResponse(risk).strategy).toBe('reduce');
  });

  it('低风险 → accept', () => {
    const risk: RiskData = { riskType: 'financial', level: 'low' };
    expect(generateRiskResponse(risk).strategy).toBe('accept');
  });
});

describe('buildRiskManagementReport', () => {
  it('生成识别数据', () => {
    const r = buildRiskManagementReport('30d');
    expect(r.identification.operational).toBeGreaterThan(0);
  });

  it('生成评估数据', () => {
    const r = buildRiskManagementReport('30d');
    expect(r.assessment.critical).toBeGreaterThanOrEqual(0);
  });

  it('生成连续性数据', () => {
    const r = buildRiskManagementReport('30d');
    expect(r.continuity.bcp).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildRiskManagementReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 合规纯函数单测（M198-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildComplianceReport,
  checkCompliance,
  generateComplianceReport,
  type ComplianceFinding,
} from '../../src/bff/aggregators/complianceAggregator';

describe('checkCompliance', () => {
  it('合规+有证据 → 通过', () => {
    const r = checkCompliance({ status: 'compliant', evidence: '已上传' }, '数安法');
    expect(r.compliant).toBe(true);
    expect(r.score).toBe(100);
  });

  it('不合规 → 不通过', () => {
    const r = checkCompliance({ status: 'non_compliant', evidence: '' }, '数安法');
    expect(r.compliant).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe('generateComplianceReport', () => {
  it('计算总评分', () => {
    const findings: ComplianceFinding[] = [
      { id: '1', severity: 'high', description: '高危' },
      { id: '2', severity: 'medium', description: '中危' },
    ];
    const r = generateComplianceReport(findings);
    expect(r.high).toBe(1);
    expect(r.overallScore).toBe(70);
  });
});

describe('buildComplianceReport', () => {
  it('生成法律法规数据', () => {
    const r = buildComplianceReport('30d');
    expect(r.laws.dataSecurity).toBe(true);
  });

  it('生成培训数据', () => {
    const r = buildComplianceReport('30d');
    expect(r.training.sessions).toBeGreaterThan(0);
  });

  it('生成审计数据', () => {
    const r = buildComplianceReport('30d');
    expect(r.audit.internal).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildComplianceReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

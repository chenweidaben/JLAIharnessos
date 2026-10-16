/**
 * 健澜科技 jlmedaios - 合规管理纯函数单测（M217-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessComplianceRisk,
  buildComplianceReport,
  trackComplianceItem,
  type ComplianceItem,
} from '../../src/bff/aggregators/complianceReportAggregator';

describe('assessComplianceRisk', () => {
  it('50 法规 5 差距 → 10% 低风险', () => {
    const r = assessComplianceRisk(50, 5);
    expect(r.level).toBe('低');
  });

  it('50 法规 20 差距 → 40% 高风险', () => {
    const r = assessComplianceRisk(50, 20);
    expect(r.level).toBe('高');
  });
});

describe('trackComplianceItem', () => {
  it('3 项目 2 合规 → 66.7% 合规率', () => {
    const items: ComplianceItem[] = [
      { name: '价格', status: '合规' },
      { name: '消防', status: '合规' },
      { name: '采购', status: '整改中' },
    ];
    const r = trackComplianceItem(items);
    expect(r.complianceRate).toBeCloseTo(0.667, 1);
  });
});

describe('buildComplianceReport', () => {
  it('生成医疗法规数据', () => {
    const r = buildComplianceReport('30d');
    expect(r.medicalRegulations.items).toBeGreaterThan(0);
  });

  it('生成医保数据', () => {
    const r = buildComplianceReport('30d');
    expect(r.insurance.audits).toBeGreaterThanOrEqual(0);
  });

  it('生成培训数据', () => {
    const r = buildComplianceReport('30d');
    expect(r.training.sessions).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildComplianceReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

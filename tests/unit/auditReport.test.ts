/**
 * 健澜科技 jlmedaios - 审计管理纯函数单测（M217-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAuditRisk,
  buildAuditReport,
  trackAuditRectification,
  type AuditFinding,
} from '../../src/bff/aggregators/auditReportAggregator';

describe('assessAuditRisk', () => {
  it('10 发现 → 中风险', () => {
    expect(assessAuditRisk(10).level).toBe('中');
  });

  it('30 发现 → 高风险', () => {
    expect(assessAuditRisk(30).level).toBe('高');
  });
});

describe('trackAuditRectification', () => {
  it('4 发现 3 整改 → 75% 整改率', () => {
    const findings: AuditFinding[] = [
      { name: '财务', rectified: true },
      { name: '采购', rectified: true },
      { name: '收费', rectified: true },
      { name: '安全', rectified: false },
    ];
    const r = trackAuditRectification(findings);
    expect(r.rectifiedRate).toBeCloseTo(0.75, 2);
  });
});

describe('buildAuditReport', () => {
  it('生成财务审计数据', () => {
    const r = buildAuditReport('30d');
    expect(r.financial.audits).toBeGreaterThan(0);
  });

  it('生成内外部审计数据', () => {
    const r = buildAuditReport('30d');
    expect(r.internal.audits).toBeGreaterThan(0);
  });

  it('生成发现数据', () => {
    const r = buildAuditReport('30d');
    expect(r.findings.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAuditReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 审计管理纯函数单测（M198-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAuditRisk,
  buildAuditManagementReport,
  trackAuditFinding,
  type AuditData,
  type AuditFinding,
} from '../../src/bff/aggregators/auditManagementAggregator';

describe('assessAuditRisk', () => {
  it('大额财务+多发现 → high', () => {
    const data: AuditData = { auditType: 'financial', amountAtRisk: 2000000, findingsCount: 15 };
    expect(assessAuditRisk(data).level).toBe('high');
  });

  it('小额+少发现 → low', () => {
    const data: AuditData = { auditType: 'it', amountAtRisk: 0, findingsCount: 2 };
    expect(assessAuditRisk(data).level).toBe('low');
  });
});

describe('trackAuditFinding', () => {
  it('未关闭且超期 → overdue', () => {
    const finding: AuditFinding = { id: '1', description: '测试', status: 'open', remediationDays: 45 };
    expect(trackAuditFinding(finding).overdue).toBe(true);
  });

  it('已关闭 → 100% 进度', () => {
    const finding: AuditFinding = { id: '1', description: '测试', status: 'closed', remediationDays: 10 };
    expect(trackAuditFinding(finding).progress).toBe(100);
  });
});

describe('buildAuditManagementReport', () => {
  it('生成内部审计数据', () => {
    const r = buildAuditManagementReport('30d');
    expect(r.internal.financial).toBeGreaterThan(0);
  });

  it('生成医疗审计数据', () => {
    const r = buildAuditManagementReport('30d');
    expect(r.medical.prescription).toBeGreaterThan(0);
  });

  it('生成发现数据', () => {
    const r = buildAuditManagementReport('30d');
    expect(r.findings.closed).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAuditManagementReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 党建行政纯函数单测（M212-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPartyBuildingActivity,
  buildPartyAdminReport,
  trackComplianceRisk,
  type ComplianceRisk,
} from '../../src/bff/aggregators/partyAdminReportAggregator';

describe('assessPartyBuildingActivity', () => {
  it('20 次会议 / 300 党员 → 0.067 不足', () => {
    const r = assessPartyBuildingActivity(20, 300);
    expect(r.level).toBe('不足');
  });

  it('200 次会议 / 300 党员 → 0.67 活跃', () => {
    const r = assessPartyBuildingActivity(200, 300);
    expect(r.level).toBe('活跃');
  });
});

describe('trackComplianceRisk', () => {
  it('3 个科室风险等级 3+ → 高风险列表', () => {
    const depts: ComplianceRisk[] = [
      { dept: '心内科', riskLevel: 4 },
      { dept: '骨科', riskLevel: 3 },
      { dept: '儿科', riskLevel: 1 },
    ];
    const r = trackComplianceRisk(depts);
    expect(r.highRisk).toContain('心内科');
    expect(r.highRisk).toContain('骨科');
  });
});

describe('buildPartyAdminReport', () => {
  it('生成党建数据', () => {
    const r = buildPartyAdminReport('30d');
    expect(r.party.members).toBeGreaterThan(0);
  });

  it('生成廉政数据', () => {
    const r = buildPartyAdminReport('30d');
    expect(r.integrity.cases).toBeGreaterThanOrEqual(0);
  });

  it('生成行政数据', () => {
    const r = buildPartyAdminReport('30d');
    expect(r.office.documents).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPartyAdminReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

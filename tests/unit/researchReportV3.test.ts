/**
 * 健澜科技 jlmedaios - 科研 V3 纯函数单测（M207-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEthicsRisk,
  buildResearchReportV3,
  scoreResearchOutput,
  type EthicsProtocol,
} from '../../src/bff/aggregators/researchReportV3Aggregator';

describe('scoreResearchOutput', () => {
  it('论文 10 专利 5 项目 3 → 100+100+90=290', () => {
    expect(scoreResearchOutput(10, 5, 3)).toBe(290);
  });
});

describe('assessEthicsRisk', () => {
  it('涉及人+弱势群体+无知情同意 → 高风险', () => {
    const p: EthicsProtocol = { involvesHuman: true, vulnerablePopulation: true, informedConsent: false };
    const r = assessEthicsRisk(p);
    expect(r.riskLevel).toBe('高风险');
    expect(r.requiresFullReview).toBe(true);
  });

  it('不涉及人 → 低风险', () => {
    const p: EthicsProtocol = { involvesHuman: false, vulnerablePopulation: false, informedConsent: true };
    const r = assessEthicsRisk(p);
    expect(r.riskLevel).toBe('低风险');
  });
});

describe('buildResearchReportV3', () => {
  it('生成课题数据', () => {
    const r = buildResearchReportV3('1y');
    expect(r.projects.national).toBeGreaterThanOrEqual(0);
  });

  it('生成论文数据', () => {
    const r = buildResearchReportV3('1y');
    expect(r.papers.sci).toBeGreaterThan(0);
  });

  it('生成伦理数据', () => {
    const r = buildResearchReportV3('1y');
    expect(r.ethics.reviewed).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildResearchReportV3('1y');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

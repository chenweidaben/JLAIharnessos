/**
 * 健澜科技 jlmedaios - 等级评审 V3 纯函数单测（M230-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessAccreditationCompliance,
  buildAccreditationReportV3,
  trackAccreditationIssue,
} from '../../src/bff/aggregators/accreditationReportV3Aggregator';

describe('assessAccreditationCompliance', () => {
  it('950条款 → 95.0% 优秀', () => {
    expect(assessAccreditationCompliance(950).level).toBe('优秀');
  });

  it('850条款 → 85.0% 良好', () => {
    expect(assessAccreditationCompliance(850).level).toBe('良好');
  });
});

describe('trackAccreditationIssue', () => {
  it('"已整改"问题 → 已销号', () => {
    expect(trackAccreditationIssue('已整改问题').resolved).toBe(true);
  });

  it('"整改中"问题 → 未销号', () => {
    expect(trackAccreditationIssue('整改中问题').resolved).toBe(false);
  });
});

describe('buildAccreditationReportV3', () => {
  it('生成标准数据', () => {
    const r = buildAccreditationReportV3('30d');
    expect(r.standard.clauses).toBeGreaterThan(0);
  });

  it('生成自查数据', () => {
    const r = buildAccreditationReportV3('30d');
    expect(r.selfAssessment.completed).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildAccreditationReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

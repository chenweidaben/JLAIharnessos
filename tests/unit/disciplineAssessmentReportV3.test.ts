/**
 * 健澜科技 jlmedaios - 学科评估 V3 纯函数单测（M230-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDisciplineRanking,
  buildDisciplineAssessmentReportV3,
  compareDiscipline,
} from '../../src/bff/aggregators/disciplineAssessmentReportV3Aggregator';

describe('assessDisciplineRanking', () => {
  it('90分 → A+', () => {
    expect(assessDisciplineRanking(90).level).toBe('A+');
  });

  it('80分 → A', () => {
    expect(assessDisciplineRanking(80).level).toBe('A');
  });
});

describe('compareDiscipline', () => {
  it('我院80 标杆90 → 落后10分', () => {
    expect(compareDiscipline(80, 90).behind).toBe(true);
  });

  it('我院90 标杆80 → 领先', () => {
    expect(compareDiscipline(90, 80).behind).toBe(false);
  });
});

describe('buildDisciplineAssessmentReportV3', () => {
  it('生成复旦数据', () => {
    const r = buildDisciplineAssessmentReportV3('30d');
    expect(r.fudan.reputation).toBeGreaterThan(0);
  });

  it('生成国家重点专科数据', () => {
    const r = buildDisciplineAssessmentReportV3('30d');
    expect(r.national.keySpecialties).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDisciplineAssessmentReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

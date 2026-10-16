/**
 * 健澜科技 jlmedaios - 学科建设 V2 纯函数单测（M219-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDisciplineLevel,
  buildDisciplineDevelopmentPlan,
  buildDisciplineReportV2,
} from '../../src/bff/aggregators/disciplineReportV2Aggregator';

describe('assessDisciplineLevel', () => {
  it('国家临床重点专科 → 国家级', () => {
    expect(assessDisciplineLevel('国家临床重点专科')).toBe('国家级');
  });

  it('省级重点专科 → 省级', () => {
    expect(assessDisciplineLevel('省级重点专科')).toBe('省级');
  });

  it('院级重点 → 院级', () => {
    expect(assessDisciplineLevel('院级重点')).toBe('院级');
  });
});

describe('buildDisciplineDevelopmentPlan', () => {
  it('当前2 目标4 → 差距2', () => {
    const r = buildDisciplineDevelopmentPlan(2, 4);
    expect(r.gap).toBe(2);
    expect(r.actions.length).toBeGreaterThan(0);
  });
});

describe('buildDisciplineReportV2', () => {
  it('生成国家级数据', () => {
    const r = buildDisciplineReportV2('30d');
    expect(r.national.specialties).toBeGreaterThan(0);
  });

  it('生成MDT数据', () => {
    const r = buildDisciplineReportV2('30d');
    expect(r.mdt.teams).toBeGreaterThan(0);
  });

  it('生成评估数据', () => {
    const r = buildDisciplineReportV2('30d');
    expect(r.assessment.score).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDisciplineReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 妇幼肿瘤专科纯函数单测（M201-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTumorStage,
  buildSpecialtyReport,
  classifyPregnancyRisk,
  type PregnancyData,
  type TumorData,
} from '../../src/bff/aggregators/specialtyAggregator';

describe('classifyPregnancyRisk', () => {
  it('低风险妊娠', () => {
    const p: PregnancyData = { age: 28, gestationalWeeks: 20, bloodPressure: 110, glucose: 5.0, previousComplications: false };
    const r = classifyPregnancyRisk(p);
    expect(r.level).toBe('低风险');
  });

  it('高风险妊娠（高龄+高血压+糖尿病）', () => {
    const p: PregnancyData = { age: 38, gestationalWeeks: 24, bloodPressure: 150, glucose: 8.0, previousComplications: true };
    const r = classifyPregnancyRisk(p);
    expect(r.level).toBe('高风险');
    expect(r.factors.length).toBeGreaterThan(0);
  });
});

describe('assessTumorStage', () => {
  it('早期肿瘤', () => {
    const t: TumorData = { sizeMm: 10, lymphNodeInvolved: false, distantMetastasis: false };
    const r = assessTumorStage(t);
    expect(r.stage).toBe('I期');
    expect(r.tnm).toBe('T1N0M0');
  });

  it('晚期转移肿瘤', () => {
    const t: TumorData = { sizeMm: 60, lymphNodeInvolved: true, distantMetastasis: true };
    const r = assessTumorStage(t);
    expect(r.stage).toBe('IV期');
  });
});

describe('buildSpecialtyReport', () => {
  it('生成妇幼数据', () => {
    const r = buildSpecialtyReport('妇幼', '30d');
    expect(r.maternalHealth.prenatalChecks).toBeGreaterThan(0);
  });

  it('生成肿瘤数据', () => {
    const r = buildSpecialtyReport('肿瘤', '30d');
    expect(r.oncology.diagnosed).toBeGreaterThan(0);
  });

  it('生成质量数据', () => {
    const r = buildSpecialtyReport('妇幼', '30d');
    expect(r.quality.readmissionRate).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildSpecialtyReport('肿瘤', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

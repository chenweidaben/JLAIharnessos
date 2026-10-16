/**
 * 健澜科技 jlmedaios - 患者画像 V2 纯函数单测（M208-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatient360,
  buildPatientProfileReportV2,
  classifyRiskLevel,
  type RiskProfile,
} from '../../src/bff/aggregators/patientProfileReportV2Aggregator';

describe('buildPatient360', () => {
  it('返回 6 维画像', () => {
    const r = buildPatient360('P001');
    expect(r.patientId).toBe('P001');
    expect(r.dimensions.length).toBe(6);
  });
});

describe('classifyRiskLevel', () => {
  it('反复住院+高费用+多重用药 → 红组', () => {
    const p: RiskProfile = { repeatedAdmission: true, highCost: true, polypharmacy: true };
    const r = classifyRiskLevel(p);
    expect(r.color).toBe('红');
  });

  it('无风险 → 绿组', () => {
    const p: RiskProfile = { repeatedAdmission: false, highCost: false, polypharmacy: false };
    const r = classifyRiskLevel(p);
    expect(r.color).toBe('绿');
  });
});

describe('buildPatientProfileReportV2', () => {
  it('生成画像数据', () => {
    const r = buildPatientProfileReportV2('30d');
    expect(r.profile.total).toBeGreaterThan(0);
  });

  it('生成慢病标签数据', () => {
    const r = buildPatientProfileReportV2('30d');
    expect(r.chronicTags.hypertension).toBeGreaterThan(0);
  });

  it('生成分组数据', () => {
    const r = buildPatientProfileReportV2('30d');
    expect(r.tiering.red).toBeGreaterThanOrEqual(0);
  });

  it('生成建议', () => {
    const r = buildPatientProfileReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

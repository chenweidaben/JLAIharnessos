/**
 * 健澜科技 jlmedaios - 智慧医疗纯函数单测（M195-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assistDiagnosis,
  buildSmartHealthcareReport,
  predictHealthRisk,
  type DiagnosisInput,
  type PatientRiskData,
} from '../../src/bff/aggregators/smartHealthcareAggregator';

describe('assistDiagnosis', () => {
  it('发热+咳嗽 → 呼吸道感染', () => {
    const input: DiagnosisInput = { symptoms: ['发热', '咳嗽'], history: [], age: 35 };
    const r = assistDiagnosis(input);
    expect(r.some((d) => d.diagnosis.includes('呼吸道'))).toBe(true);
  });

  it('胸痛+高血压史 → 冠心病', () => {
    const input: DiagnosisInput = { symptoms: ['胸痛'], history: ['高血压'], age: 60 };
    const r = assistDiagnosis(input);
    expect(r.some((d) => d.diagnosis.includes('冠心'))).toBe(true);
  });

  it('无症状 → 待检查', () => {
    const input: DiagnosisInput = { symptoms: [], history: [], age: 30 };
    const r = assistDiagnosis(input);
    expect(r[0].diagnosis).toContain('待');
  });
});

describe('predictHealthRisk', () => {
  it('高龄+肥胖+吸烟+家族史 → 高风险', () => {
    const data: PatientRiskData = { age: 70, bmi: 30, smoking: true, familyHistory: true };
    expect(predictHealthRisk(data).level).toBe('high');
  });

  it('健康生活 → 低风险', () => {
    const data: PatientRiskData = { age: 30, bmi: 22, smoking: false, familyHistory: false };
    expect(predictHealthRisk(data).level).toBe('low');
  });
});

describe('buildSmartHealthcareReport', () => {
  it('生成导诊数据', () => {
    const r = buildSmartHealthcareReport('30d');
    expect(r.triage.intelligent).toBeGreaterThan(0);
  });

  it('生成诊断数据', () => {
    const r = buildSmartHealthcareReport('30d');
    expect(r.diagnosis.assisted).toBeGreaterThan(0);
  });

  it('生成健康风险', () => {
    const r = buildSmartHealthcareReport('30d');
    expect(r.healthRisk.assessed).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildSmartHealthcareReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

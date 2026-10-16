/**
 * 健澜科技 jlmedaios - 健康管理 V3 纯函数单测（M206-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessChronicDiseaseControl,
  buildHealthManagementReportV3,
  generateHealthRiskAssessment,
  type ChronicPatient,
  type HealthRiskPerson,
} from '../../src/bff/aggregators/healthManagementReportV3Aggregator';

describe('assessChronicDiseaseControl', () => {
  it('10 人 6 人控制 → 60%', () => {
    const patients: ChronicPatient[] = [
      { disease: '高血压', controlled: true },
      { disease: '高血压', controlled: true },
      { disease: '高血压', controlled: true },
      { disease: '高血压', controlled: true },
      { disease: '高血压', controlled: true },
      { disease: '糖尿病', controlled: true },
      { disease: '糖尿病', controlled: false },
      { disease: '糖尿病', controlled: false },
      { disease: '糖尿病', controlled: false },
      { disease: '糖尿病', controlled: false },
    ];
    const r = assessChronicDiseaseControl(patients);
    expect(r.controlRate).toBe(0.6);
  });
});

describe('generateHealthRiskAssessment', () => {
  it('高龄+肥胖+吸烟+家族史 → 高风险', () => {
    const p: HealthRiskPerson = { age: 65, bmi: 30, smoking: true, familyHistory: true };
    const r = generateHealthRiskAssessment(p);
    expect(r.riskLevel).toBe('高风险');
  });

  it('年轻+健康 → 低风险', () => {
    const p: HealthRiskPerson = { age: 30, bmi: 22, smoking: false, familyHistory: false };
    const r = generateHealthRiskAssessment(p);
    expect(r.riskLevel).toBe('低风险');
  });
});

describe('buildHealthManagementReportV3', () => {
  it('生成档案数据', () => {
    const r = buildHealthManagementReportV3('30d');
    expect(r.ehr.total).toBeGreaterThan(0);
  });

  it('生成慢病数据', () => {
    const r = buildHealthManagementReportV3('30d');
    expect(r.chronic.hypertension).toBeGreaterThan(0);
  });

  it('生成体检数据', () => {
    const r = buildHealthManagementReportV3('30d');
    expect(r.exam.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildHealthManagementReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

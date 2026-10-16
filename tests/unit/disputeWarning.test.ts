/**
 * 健澜科技 jlmedaios - 医疗纠纷预警纯函数单测（M188-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMedicalDisputeWarning,
  predictDisputeRisk,
  type PatientRecord,
} from '../../src/bff/aggregators/disputeWarningAggregator';

const baseRecord: PatientRecord = {
  patientId: 'p1',
  dept: '骨科',
  doctor: '张医生',
  diagnosis: '骨折',
  hadComplication: false,
  hadCommunicationIssue: false,
  totalCost: 15000,
  previousComplaints: 0,
};

describe('predictDisputeRisk', () => {
  it('并发症 → high', () => {
    const r = predictDisputeRisk({ ...baseRecord, hadComplication: true });
    expect(r.level).toBe('high');
  });

  it('沟通问题 → medium', () => {
    const r = predictDisputeRisk({ ...baseRecord, hadCommunicationIssue: true });
    expect(r.level).toBe('medium');
  });

  it('既往投诉 → medium', () => {
    const r = predictDisputeRisk({ ...baseRecord, previousComplaints: 1 });
    expect(r.level).toBe('medium');
  });

  it('高额费用 → medium', () => {
    const r = predictDisputeRisk({ ...baseRecord, totalCost: 60000 });
    expect(r.level).toBe('medium');
  });

  it('正常 → low', () => {
    expect(predictDisputeRisk(baseRecord).level).toBe('low');
  });
});

describe('buildMedicalDisputeWarning', () => {
  it('生成预警病例', () => {
    const r = buildMedicalDisputeWarning('90d');
    expect(r.predictedRiskCases.length).toBeGreaterThan(0);
  });

  it('生成高风险科室列表', () => {
    const r = buildMedicalDisputeWarning('90d');
    expect(r.highRiskDepts.length).toBeGreaterThan(0);
  });

  it('生成纠纷原因分析', () => {
    const r = buildMedicalDisputeWarning('90d');
    expect(r.disputeCauses.length).toBeGreaterThan(0);
  });

  it('生成改进建议', () => {
    const r = buildMedicalDisputeWarning('90d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

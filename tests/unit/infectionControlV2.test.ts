/**
 * 健澜科技 jlmedaios - 院感控制 V2 纯函数单测（M188-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildInfectionControlReport,
  predictInfectionRisk,
  type DeptInfectionDataV2,
} from '../../src/bff/aggregators/infectionControlV2Aggregator';

const baseData: DeptInfectionDataV2 = {
  dept: 'ICU',
  patientDays: 3000,
  infectionCases: 24,
  ssiCases: 3,
  surgeries: 200,
  cautiCases: 2,
  catheterDays: 500,
  clabsiCases: 1,
  centralLineDays: 300,
  vapiCases: 2,
  ventilatorDays: 200,
  sterilizationPassRate: 0.96,
  handHygieneCompliance: 0.85,
};

describe('predictInfectionRisk', () => {
  it('感染率 >10‰ → high', () => {
    const d = { ...baseData, infectionCases: 40 };
    expect(predictInfectionRisk(d).level).toBe('high');
  });

  it('手卫生 <80% → medium', () => {
    const d = { ...baseData, handHygieneCompliance: 0.7 };
    expect(predictInfectionRisk(d).level).toBe('medium');
  });

  it('消毒合格率 <95% → medium', () => {
    const d = { ...baseData, sterilizationPassRate: 0.9 };
    expect(predictInfectionRisk(d).level).toBe('medium');
  });

  it('正常 → low', () => {
    expect(predictInfectionRisk(baseData).level).toBe('low');
  });
});

describe('buildInfectionControlReport', () => {
  it('感染率 = 例数/床日 ×1000', () => {
    const r = buildInfectionControlReport('ICU', '30d');
    expect(r.infectionRate).toBeCloseTo(8.0, 0);
  });

  it('生成风险等级', () => {
    const r = buildInfectionControlReport('ICU', '30d');
    expect(r.riskLevel.level).toBeDefined();
  });

  it('生成改进建议', () => {
    const r = buildInfectionControlReport('ICU', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 合理用药监测纯函数单测（M188-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildRationalDrugUseReport,
  detectIrrationalDrugUse,
  type Prescription,
} from '../../src/bff/aggregators/rationalDrugUseAggregator';

describe('detectIrrationalDrugUse', () => {
  it('无感染诊断但用抗菌药 → 无指征', () => {
    const p: Prescription = {
      drugName: '阿莫西林', isAntibiotic: true, antibioticTier: 'non_restricted',
      dosage: '0.5g', frequency: 'tid', isInjection: false, isEssential: true,
      daysSupply: 7, diagnosis: '高血压',
    };
    const issues = detectIrrationalDrugUse(p);
    expect(issues.some((i) => i.includes('无指征'))).toBe(true);
  });

  it('抗菌药疗程 >14 天 → 疗程过长', () => {
    const p: Prescription = {
      drugName: '美罗培南', isAntibiotic: true, antibioticTier: 'special',
      dosage: '1g', frequency: 'q8h', isInjection: true, isEssential: false,
      daysSupply: 21, diagnosis: '肺炎',
    };
    const issues = detectIrrationalDrugUse(p);
    expect(issues.some((i) => i.includes('疗程'))).toBe(true);
  });

  it('特殊使用级 → 需会诊', () => {
    const p: Prescription = {
      drugName: '美罗培南', isAntibiotic: true, antibioticTier: 'special',
      dosage: '1g', frequency: 'q8h', isInjection: true, isEssential: false,
      daysSupply: 7, diagnosis: '肺炎',
    };
    const issues = detectIrrationalDrugUse(p);
    expect(issues.some((i) => i.includes('特殊使用级'))).toBe(true);
  });

  it('合理处方无问题', () => {
    const p: Prescription = {
      drugName: '阿莫西林', isAntibiotic: true, antibioticTier: 'non_restricted',
      dosage: '0.5g', frequency: 'tid', isInjection: false, isEssential: true,
      daysSupply: 7, diagnosis: '急性支气管炎',
    };
    expect(detectIrrationalDrugUse(p).length).toBe(0);
  });
});

describe('buildRationalDrugUseReport', () => {
  it('生成不合理处方清单', () => {
    const r = buildRationalDrugUseReport('30d');
    expect(r.irrationalPrescriptions.length).toBeGreaterThan(0);
  });

  it('抗菌药物分级比例之和 ≈ 1', () => {
    const r = buildRationalDrugUseReport('30d');
    const sum = r.antibioticTierRatio.nonRestricted + r.antibioticTierRatio.restricted + r.antibioticTierRatio.special;
    expect(sum).toBeCloseTo(1.0, 1);
  });

  it('生成改进建议', () => {
    const r = buildRationalDrugUseReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

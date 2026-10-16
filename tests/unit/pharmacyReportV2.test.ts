/**
 * 健澜科技 jlmedaios - 药事 V2 纯函数单测（M212-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPrescriptionRationality,
  buildPharmacyReportV2,
  calculateAntibioticDdd,
} from '../../src/bff/aggregators/pharmacyReportV2Aggregator';

describe('assessPrescriptionRationality', () => {
  it('10000 处方 9800 合理 → 98% 达标', () => {
    const r = assessPrescriptionRationality(10000, 9800);
    expect(r.rate).toBe(0.98);
    expect(r.level).toBe('达标');
  });

  it('10000 处方 8500 合理 → 85% 不达标', () => {
    const r = assessPrescriptionRationality(10000, 8500);
    expect(r.level).toBe('不达标');
  });
});

describe('calculateAntibioticDdd', () => {
  it('消耗 3500 / 10000 床日 → 35 偏高', () => {
    const r = calculateAntibioticDdd(3500, 10000);
    expect(r.ddd).toBe(35);
    expect(r.level).toBe('偏高');
  });

  it('消耗 2500 / 10000 床日 → 25 合理', () => {
    const r = calculateAntibioticDdd(2500, 10000);
    expect(r.level).toBe('合理');
  });
});

describe('buildPharmacyReportV2', () => {
  it('生成供应数据', () => {
    const r = buildPharmacyReportV2('30d');
    expect(r.supply.total).toBeGreaterThan(0);
  });

  it('生成处方数据', () => {
    const r = buildPharmacyReportV2('30d');
    expect(r.prescription.reviewed).toBeGreaterThan(0);
  });

  it('生成PIVAS数据', () => {
    const r = buildPharmacyReportV2('30d');
    expect(r.pivas.prepared).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPharmacyReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
